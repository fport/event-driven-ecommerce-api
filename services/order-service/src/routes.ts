import { Hono } from "hono";
import type { Order, ApiResponse } from "@ecommerce/shared";
import { apmMiddleware, logger, metricsMiddleware, getPrometheusMetrics } from "@ecommerce/shared";
import { store } from "./store";
import { cache } from "./cache";
import { createOrderSchema, updateOrderSchema } from "./validation";
import { rateLimiter } from "./middleware/rate-limit";
import { publishOrderCreated, publishOrderUpdated } from "./events/producer";
import { executeOrderSaga } from "./saga/order-saga";

const app = new Hono();

// APM + tracing + metrics
app.use("*", apmMiddleware());
app.use("*", metricsMiddleware());

// Rate limiting (applied to all routes except health)
app.use("/orders/*", rateLimiter);
app.use("/orders", rateLimiter);

// Prometheus metrics
app.get("/metrics", (c) => {
  return c.text(getPrometheusMetrics("order-service"));
});

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "order-service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// GET /orders - List all orders
app.get("/orders", async (c) => {
  const cached = await cache.getOrderList();
  if (cached) {
    return c.json<ApiResponse<Order[]>>({ success: true, data: cached });
  }

  const orders = await store.getAll();
  await cache.setOrderList(orders);
  return c.json<ApiResponse<Order[]>>({ success: true, data: orders });
});

// GET /orders/:id - Get order by ID
app.get("/orders/:id", async (c) => {
  const id = c.req.param("id");

  const cached = await cache.getOrder(id);
  if (cached) {
    return c.json<ApiResponse<Order>>({ success: true, data: cached });
  }

  const order = await store.getById(id);
  if (!order) {
    return c.json<ApiResponse>({ success: false, error: "Order not found" }, 404);
  }

  await cache.setOrder(order);
  return c.json<ApiResponse<Order>>({ success: true, data: order });
});

// POST /orders - Create new order (write-through: DB then cache)
app.post("/orders", async (c) => {
  const body = await c.req.json();
  const result = createOrderSchema.safeParse(body);

  if (!result.success) {
    return c.json<ApiResponse>(
      { success: false, error: result.error.issues.map((i) => i.message).join(", ") },
      400,
    );
  }

  const { customerName, customerEmail, items } = result.data;
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const created = await store.create({ customerName, customerEmail, items, totalAmount });
  await cache.setOrder(created);
  publishOrderCreated(created);
  return c.json<ApiResponse<Order>>({ success: true, data: created }, 201);
});

// POST /orders/checkout - Saga-based order with stock check + payment
app.post("/orders/checkout", async (c) => {
  const body = await c.req.json();
  const result = createOrderSchema.safeParse(body);

  if (!result.success) {
    return c.json<ApiResponse>(
      { success: false, error: result.error.issues.map((i) => i.message).join(", ") },
      400,
    );
  }

  const { customerName, customerEmail, items } = result.data;
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Execute saga: check stock -> reserve stock -> payment
  const saga = await executeOrderSaga(items, totalAmount);
  if (!saga.success) {
    return c.json<ApiResponse>({ success: false, error: saga.error }, 422);
  }

  // Saga succeeded - create the order as confirmed
  const created = await store.create({ customerName, customerEmail, items, totalAmount });
  const confirmed = await store.update(created.id, { status: "confirmed" });
  await cache.setOrder(confirmed!);
  publishOrderCreated(confirmed!);

  return c.json<ApiResponse<Order & { paymentId?: string }>>({
    success: true,
    data: { ...confirmed!, paymentId: saga.paymentId },
  }, 201);
});

// PATCH /orders/:id - Update order (write-through: DB then cache)
app.patch("/orders/:id", async (c) => {
  const body = await c.req.json();
  const result = updateOrderSchema.safeParse(body);

  if (!result.success) {
    return c.json<ApiResponse>(
      { success: false, error: result.error.issues.map((i) => i.message).join(", ") },
      400,
    );
  }

  const updated = await store.update(c.req.param("id"), result.data);
  if (!updated) {
    return c.json<ApiResponse>({ success: false, error: "Order not found" }, 404);
  }

  await cache.setOrder(updated);
  publishOrderUpdated(updated);
  return c.json<ApiResponse<Order>>({ success: true, data: updated });
});

export default app;
