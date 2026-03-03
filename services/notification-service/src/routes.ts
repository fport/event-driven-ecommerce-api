import { Hono } from "hono";
import { apmMiddleware, metricsMiddleware, getPrometheusMetrics } from "@ecommerce/shared";
import { getNotificationsCollection } from "./db";

const app = new Hono();

app.use("*", apmMiddleware());
app.use("*", metricsMiddleware());

app.get("/metrics", (c) => c.text(getPrometheusMetrics("notification-service")));

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "notification-service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// GET /notifications - List all notifications
app.get("/notifications", async (c) => {
  const collection = getNotificationsCollection();
  const limit = Number(c.req.query("limit")) || 50;
  const notifications = await collection.find().sort({ sentAt: -1 }).limit(limit).toArray();
  return c.json({ success: true, data: notifications });
});

// GET /notifications/:orderId - Get notifications for a specific order
app.get("/notifications/:orderId", async (c) => {
  const collection = getNotificationsCollection();
  const notifications = await collection
    .find({ orderId: c.req.param("orderId") })
    .sort({ sentAt: -1 })
    .toArray();
  return c.json({ success: true, data: notifications });
});

export default app;
