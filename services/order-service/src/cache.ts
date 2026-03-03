import Redis from "ioredis";
import type { Order } from "@ecommerce/shared";

const CACHE_TTL = 300; // 5 minutes
const ORDER_PREFIX = "order:";
const ORDER_LIST_KEY = "orders:all";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export const cache = {
  async getOrder(id: string): Promise<Order | null> {
    const data = await redis.get(`${ORDER_PREFIX}${id}`);
    return data ? JSON.parse(data) : null;
  },

  async setOrder(order: Order): Promise<void> {
    await redis.set(`${ORDER_PREFIX}${order.id}`, JSON.stringify(order), "EX", CACHE_TTL);
    // Invalidate list cache on any single order change
    await redis.del(ORDER_LIST_KEY);
  },

  async getOrderList(): Promise<Order[] | null> {
    const data = await redis.get(ORDER_LIST_KEY);
    return data ? JSON.parse(data) : null;
  },

  async setOrderList(orders: Order[]): Promise<void> {
    await redis.set(ORDER_LIST_KEY, JSON.stringify(orders), "EX", CACHE_TTL);
  },

  async invalidateOrder(id: string): Promise<void> {
    await redis.del(`${ORDER_PREFIX}${id}`, ORDER_LIST_KEY);
  },

  getClient() {
    return redis;
  },
};
