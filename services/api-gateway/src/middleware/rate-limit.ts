import type { Context, Next } from "hono";
import Redis from "ioredis";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 200; // Higher limit at gateway level

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export async function gatewayRateLimiter(c: Context, next: Next) {
  const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  const key = `gateway:ratelimit:${ip}`;

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }

  const ttl = await redis.ttl(key);
  c.header("X-RateLimit-Limit", String(MAX_REQUESTS));
  c.header("X-RateLimit-Remaining", String(Math.max(0, MAX_REQUESTS - current)));
  c.header("X-RateLimit-Reset", String(ttl));

  if (current > MAX_REQUESTS) {
    return c.json({ success: false, error: "Too many requests" }, 429);
  }

  await next();
}
