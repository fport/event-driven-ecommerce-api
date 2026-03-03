import { Hono } from "hono";
import { apmMiddleware } from "@ecommerce/shared";
import { searchOrders, getStats } from "./elastic";

const app = new Hono();

app.use("*", apmMiddleware());

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "search-service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// GET /search?q=laptop&status=pending&from=0&size=20
app.get("/search", async (c) => {
  const q = c.req.query("q");
  const status = c.req.query("status");
  const from = Number(c.req.query("from")) || 0;
  const size = Number(c.req.query("size")) || 20;

  const result = await searchOrders({ q, status, from, size });
  return c.json({ success: true, data: result });
});

// GET /search/stats - Aggregated stats for dashboards
app.get("/search/stats", async (c) => {
  const stats = await getStats();
  return c.json({ success: true, data: stats });
});

export default app;
