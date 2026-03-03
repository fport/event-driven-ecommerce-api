import type { OpenApiSpec } from "@ecommerce/shared";

export const spec: OpenApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "API Gateway",
    version: "1.0.0",
    description: "Unified gateway — auth (Better Auth), rate limiting, circuit breaker, proxy routing",
  },
  servers: [{ url: "http://localhost:3000", description: "Local" }],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: { "200": { description: "Service status" } },
      },
    },
    "/api/auth/sign-up/email": {
      post: {
        tags: ["Auth"],
        summary: "Register with email & password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "name"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  name: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "User created" },
          "400": { description: "Validation error" },
        },
      },
    },
    "/api/auth/sign-in/email": {
      post: {
        tags: ["Auth"],
        summary: "Login with email & password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Session token returned" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/auth/sign-in/social": {
      post: {
        tags: ["Auth"],
        summary: "Social login (GitHub / Google)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["provider", "callbackURL"],
                properties: {
                  provider: { type: "string", enum: ["github", "google"] },
                  callbackURL: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Redirect URL returned" },
        },
      },
    },
    "/api/orders": {
      get: {
        tags: ["Orders (proxy)"],
        summary: "List orders (proxied to order-service)",
        security: [{ session: [] }],
        responses: { "200": { description: "Orders array" }, "401": { description: "Unauthorized" } },
      },
      post: {
        tags: ["Orders (proxy)"],
        summary: "Create order (proxied to order-service)",
        security: [{ session: [] }],
        responses: { "201": { description: "Order created" }, "401": { description: "Unauthorized" } },
      },
    },
    "/api/orders/checkout": {
      post: {
        tags: ["Orders (proxy)"],
        summary: "Saga checkout (proxied to order-service)",
        security: [{ session: [] }],
        responses: { "201": { description: "Checkout OK" }, "422": { description: "Saga failed" } },
      },
    },
    "/api/orders/{id}": {
      get: {
        tags: ["Orders (proxy)"],
        summary: "Get order by ID",
        security: [{ session: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Order" }, "404": { description: "Not found" } },
      },
      patch: {
        tags: ["Orders (proxy)"],
        summary: "Update order",
        security: [{ session: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated" } },
      },
    },
    "/api/search": {
      get: {
        tags: ["Search (proxy)"],
        summary: "Full-text search",
        security: [{ session: [] }],
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Results" } },
      },
    },
    "/api/search/stats": {
      get: {
        tags: ["Search (proxy)"],
        summary: "Order stats",
        security: [{ session: [] }],
        responses: { "200": { description: "Stats" } },
      },
    },
    "/api/notifications": {
      get: {
        tags: ["Notifications (proxy)"],
        summary: "List notifications",
        security: [{ session: [] }],
        responses: { "200": { description: "Notifications" } },
      },
    },
    "/api/notifications/{orderId}": {
      get: {
        tags: ["Notifications (proxy)"],
        summary: "Notifications for an order",
        security: [{ session: [] }],
        parameters: [{ name: "orderId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Notifications" } },
      },
    },
    "/api/products": {
      get: {
        tags: ["Inventory (proxy)"],
        summary: "List products",
        security: [{ session: [] }],
        responses: { "200": { description: "Products" } },
      },
      post: {
        tags: ["Inventory (proxy)"],
        summary: "Create / update product",
        security: [{ session: [] }],
        responses: { "201": { description: "Product saved" } },
      },
    },
    "/api/products/{id}": {
      get: {
        tags: ["Inventory (proxy)"],
        summary: "Get product",
        security: [{ session: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Product" } },
      },
      patch: {
        tags: ["Inventory (proxy)"],
        summary: "Adjust stock",
        security: [{ session: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated" } },
      },
      delete: {
        tags: ["Inventory (proxy)"],
        summary: "Delete product",
        security: [{ session: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted" } },
      },
    },
  },
  components: {
    securitySchemes: {
      session: {
        type: "apiKey",
        in: "cookie",
        name: "better-auth.session_token",
        description: "Session cookie set by Better Auth after login",
      },
    },
  },
};
