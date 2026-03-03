import type { Context } from "hono";
import { getBreaker } from "./middleware/circuit-breaker";

const SERVICE_URLS: Record<string, string> = {
  "order-service": process.env.ORDER_SERVICE_URL || "http://localhost:3001",
  "notification-service": process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3002",
  "inventory-service": process.env.INVENTORY_SERVICE_URL || "http://localhost:3003",
  "search-service": process.env.SEARCH_SERVICE_URL || "http://localhost:3004",
};

export async function proxyRequest(c: Context, serviceName: string, path: string): Promise<Response> {
  const breaker = getBreaker(serviceName);
  const baseUrl = SERVICE_URLS[serviceName];

  if (!baseUrl) {
    return c.json({ success: false, error: `Unknown service: ${serviceName}` }, 502);
  }

  try {
    const response = await breaker.call(async () => {
      const url = `${baseUrl}${path}${c.req.url.includes("?") ? "?" + c.req.url.split("?")[1] : ""}`;
      const headers = new Headers(c.req.raw.headers);
      headers.set("x-forwarded-for", c.req.header("x-forwarded-for") || "unknown");

      // Propagate trace headers
      const traceId = c.get("traceId");
      if (traceId) headers.set("x-trace-id", traceId);

      const init: RequestInit = {
        method: c.req.method,
        headers,
      };

      if (!["GET", "HEAD"].includes(c.req.method)) {
        init.body = await c.req.raw.clone().text();
      }

      return fetch(url, init);
    });

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Service unavailable";
    return c.json({ success: false, error: message }, 503);
  }
}
