import amqp from "amqplib";
import type { Order, OrderEvent } from "@ecommerce/shared";
import { EXCHANGES, ROUTING_KEYS, QUEUES } from "@ecommerce/shared";

let channel: amqp.Channel | null = null;
let connection: amqp.Connection | null = null;

export async function connectProducer(): Promise<void> {
  const url = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      connection = await amqp.connect(url);
      channel = await connection.createChannel();

      // Topic exchange for order events
      await channel.assertExchange(EXCHANGES.ORDERS, "topic", { durable: true });

      // Dead letter exchange + queue
      await channel.assertExchange(`${EXCHANGES.ORDERS}.dlx`, "fanout", { durable: true });
      await channel.assertQueue(QUEUES.DLQ_ORDERS, { durable: true });
      await channel.bindQueue(QUEUES.DLQ_ORDERS, `${EXCHANGES.ORDERS}.dlx`, "");

      console.log("RabbitMQ producer connected");
      return;
    } catch (err) {
      console.log(`RabbitMQ connection attempt ${attempt}/10 failed, retrying in 3s...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  throw new Error("Failed to connect to RabbitMQ after 10 attempts");
}

export function publishOrderCreated(order: Order): void {
  if (!channel) {
    console.error("RabbitMQ channel not available, skipping event publish");
    return;
  }

  const event: OrderEvent = {
    id: crypto.randomUUID(),
    type: "order.created",
    timestamp: new Date().toISOString(),
    data: order,
  };

  channel.publish(
    EXCHANGES.ORDERS,
    ROUTING_KEYS.ORDER_CREATED,
    Buffer.from(JSON.stringify(event)),
    { persistent: true, contentType: "application/json" },
  );

  console.log(`Published order.created event for order ${order.id}`);
}

export function publishOrderUpdated(order: Order): void {
  if (!channel) {
    console.error("RabbitMQ channel not available, skipping event publish");
    return;
  }

  const event: OrderEvent = {
    id: crypto.randomUUID(),
    type: "order.updated",
    timestamp: new Date().toISOString(),
    data: order,
  };

  channel.publish(
    EXCHANGES.ORDERS,
    ROUTING_KEYS.ORDER_UPDATED,
    Buffer.from(JSON.stringify(event)),
    { persistent: true, contentType: "application/json" },
  );

  console.log(`Published order.updated event for order ${order.id}`);
}
