import amqp from "amqplib";
import type { OrderEvent } from "@ecommerce/shared";
import { EXCHANGES, ROUTING_KEYS, QUEUES } from "@ecommerce/shared";
import { indexOrder } from "./elastic";

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

  await channel.assertQueue(QUEUES.SEARCH_ORDERS, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": `${EXCHANGES.ORDERS}.dlx`,
    },
  });

  // Listen to all order events
  await channel.bindQueue(QUEUES.SEARCH_ORDERS, EXCHANGES.ORDERS, ROUTING_KEYS.ORDER_CREATED);
  await channel.bindQueue(QUEUES.SEARCH_ORDERS, EXCHANGES.ORDERS, ROUTING_KEYS.ORDER_UPDATED);

  await channel.prefetch(10);

  channel.consume(QUEUES.SEARCH_ORDERS, async (msg) => {
    if (!msg) return;

    const retryCount = (msg.properties.headers?.["x-retry-count"] as number) || 0;

    try {
      const event: OrderEvent = JSON.parse(msg.content.toString());
      console.log(`Indexing ${event.type} for order ${event.data.id}`);

      await indexOrder(event.data);
      channel.ack(msg);
    } catch (err) {
      console.error(`Error indexing (attempt ${retryCount + 1}):`, err);

      if (retryCount < MAX_RETRIES) {
        channel.ack(msg);
        channel.publish(EXCHANGES.ORDERS, msg.fields.routingKey, msg.content, {
          ...msg.properties,
          headers: { ...msg.properties.headers, "x-retry-count": retryCount + 1 },
        });
      } else {
        channel.nack(msg, false, false);
      }
    }
  });

  console.log(`Search consumer listening on queue: ${QUEUES.SEARCH_ORDERS}`);
}
