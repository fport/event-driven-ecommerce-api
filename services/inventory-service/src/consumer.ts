import amqp from "amqplib";
import type { OrderCreatedEvent } from "@ecommerce/shared";
import { EXCHANGES, ROUTING_KEYS, QUEUES } from "@ecommerce/shared";
import { inventoryDb } from "./db";

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

  await channel.assertExchange(EXCHANGES.ORDERS, "topic", { durable: true });
  await channel.assertExchange(`${EXCHANGES.ORDERS}.dlx`, "fanout", { durable: true });

  await channel.assertQueue(QUEUES.INVENTORY_ORDERS, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": `${EXCHANGES.ORDERS}.dlx`,
    },
  });

  // Only listen to order.created (to decrease stock)
  await channel.bindQueue(QUEUES.INVENTORY_ORDERS, EXCHANGES.ORDERS, ROUTING_KEYS.ORDER_CREATED);

  await channel.prefetch(10);

  channel.consume(QUEUES.INVENTORY_ORDERS, async (msg) => {
    if (!msg) return;

    const retryCount = (msg.properties.headers?.["x-retry-count"] as number) || 0;

    try {
      const event: OrderCreatedEvent = JSON.parse(msg.content.toString());
      console.log(`Received order.created event for order ${event.data.id}`);

      for (const item of event.data.items) {
        const result = await inventoryDb.decreaseStock(item.productId, item.quantity);
        if (result.success) {
          console.log(`Stock decreased for ${item.productId}: remaining ${result.stock}`);
        } else {
          console.log(`Insufficient stock for ${item.productId} (requested: ${item.quantity}, available: ${result.stock ?? "not found"})`);
        }
      }

      channel.ack(msg);
    } catch (err) {
      console.error(`Error processing message (attempt ${retryCount + 1}):`, err);

      if (retryCount < MAX_RETRIES) {
        channel.ack(msg);
        channel.publish(EXCHANGES.ORDERS, msg.fields.routingKey, msg.content, {
          ...msg.properties,
          headers: { ...msg.properties.headers, "x-retry-count": retryCount + 1 },
        });
      } else {
        console.log(`Message exceeded max retries, sending to DLQ`);
        channel.nack(msg, false, false);
      }
    }
  });

  console.log(`Inventory consumer listening on queue: ${QUEUES.INVENTORY_ORDERS}`);
}
