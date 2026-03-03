import type { Context, Next } from "hono";
import { cache } from "../cache";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 100;

export async function rateLimiter(c: Context, next: Next) {
  const ip = c.req.header("x-forwarded-for") || "unknown";
  const key = `ratelimit:${ip}`;
  const redis = cache.getClient();

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
