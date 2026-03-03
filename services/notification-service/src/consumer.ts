import amqp from "amqplib";
import type { OrderEvent } from "@ecommerce/shared";
import { EXCHANGES, ROUTING_KEYS, QUEUES } from "@ecommerce/shared";
import { getNotificationsCollection } from "./db";

const MAX_RETRIES = 3;

export async function startConsumer(): Promise<void> {
  const url = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

  let connection: amqp.Connection | null = null;

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      connection = await amqp.connect(url);
      break;
    } catch {
      console.log(`RabbitMQ connection attempt ${attempt}/10 failed, retrying in 3s...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  if (!connection) throw new Error("Failed to connect to RabbitMQ");

  const channel = await connection.createChannel();

  // Ensure exchange exists
  await channel.assertExchange(EXCHANGES.ORDERS, "topic", { durable: true });
  await channel.assertExchange(`${EXCHANGES.ORDERS}.dlx`, "fanout", { durable: true });

  // Queue with DLQ support
  await channel.assertQueue(QUEUES.NOTIFICATION_ORDERS, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": `${EXCHANGES.ORDERS}.dlx`,
    },
  });

  // Bind to order.created and order.updated
  await channel.bindQueue(QUEUES.NOTIFICATION_ORDERS, EXCHANGES.ORDERS, ROUTING_KEYS.ORDER_CREATED);
  await channel.bindQueue(QUEUES.NOTIFICATION_ORDERS, EXCHANGES.ORDERS, ROUTING_KEYS.ORDER_UPDATED);

  // DLQ
  await channel.assertQueue(QUEUES.DLQ_ORDERS, { durable: true });
  await channel.bindQueue(QUEUES.DLQ_ORDERS, `${EXCHANGES.ORDERS}.dlx`, "");

  await channel.prefetch(10);

  channel.consume(QUEUES.NOTIFICATION_ORDERS, async (msg) => {
    if (!msg) return;

    const retryCount = (msg.properties.headers?.["x-retry-count"] as number) || 0;

    try {
      const event: OrderEvent = JSON.parse(msg.content.toString());
      console.log(`Received ${event.type} event for order ${event.data.id}`);

      const collection = getNotificationsCollection();
      await collection.insertOne({
        orderId: event.data.id,
        customerName: event.data.customerName,
        customerEmail: event.data.customerEmail,
        type: event.type,
        message: `Order ${event.data.id} - ${event.type}: ${event.data.status}`,
        sentAt: new Date(),
      });

      console.log(`Notification saved for order ${event.data.id}`);
      channel.ack(msg);
    } catch (err) {
      console.error(`Error processing message (attempt ${retryCount + 1}):`, err);

      if (retryCount < MAX_RETRIES) {
        // Retry with delay via republish
        channel.ack(msg);
        channel.publish(EXCHANGES.ORDERS, msg.fields.routingKey, msg.content, {
          ...msg.properties,
          headers: { ...msg.properties.headers, "x-retry-count": retryCount + 1 },
        });
      } else {
        // Send to DLQ
        console.log(`Message exceeded max retries, sending to DLQ`);
        channel.nack(msg, false, false);
      }
    }
  });

  console.log(`Notification consumer listening on queue: ${QUEUES.NOTIFICATION_ORDERS}`);
}
