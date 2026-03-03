import { Hono } from "hono";
import { cors } from "hono/cors";
import { apmMiddleware, metricsMiddleware, getPrometheusMetrics } from "@ecommerce/shared";
import { auth } from "./auth";
import { authGuard } from "./middleware/auth-guard";
import { gatewayRateLimiter } from "./middleware/rate-limit";
import { proxyRequest } from "./proxy";

const app = new Hono();

// Global middleware
app.use("*", cors());
app.use("*", apmMiddleware());
app.use("*", metricsMiddleware());
app.use("/api/*", gatewayRateLimiter);

// Prometheus metrics (public)
app.get("/metrics", (c) => c.text(getPrometheusMetrics("api-gateway")));

// Health check (public)
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "api-gateway",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Better Auth routes (public) - signup, login, logout, session
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// --- Protected routes below ---

// Order service
app.all("/api/orders/checkout", authGuard, (c) => proxyRequest(c, "order-service", "/orders/checkout"));
app.all("/api/orders", authGuard, (c) => proxyRequest(c, "order-service", "/orders"));
app.all("/api/orders/:id", authGuard, (c) =>
  proxyRequest(c, "order-service", `/orders/${c.req.param("id")}`),
);

// Search service
app.all("/api/search", authGuard, (c) => proxyRequest(c, "search-service", "/search"));
app.all("/api/search/stats", authGuard, (c) => proxyRequest(c, "search-service", "/search/stats"));

// Notification service
app.all("/api/notifications", authGuard, (c) =>
  proxyRequest(c, "notification-service", "/notifications"),
);
app.all("/api/notifications/:orderId", authGuard, (c) =>
  proxyRequest(c, "notification-service", `/notifications/${c.req.param("orderId")}`),
);

// Inventory service
app.all("/api/products", authGuard, (c) => proxyRequest(c, "inventory-service", "/products"));
app.all("/api/products/:id", authGuard, (c) =>
  proxyRequest(c, "inventory-service", `/products/${c.req.param("id")}`),
);

export default app;
