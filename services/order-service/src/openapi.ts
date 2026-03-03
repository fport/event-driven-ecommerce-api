import type { OpenApiSpec } from "@ecommerce/shared";

export const spec: OpenApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Order Service",
    version: "1.0.0",
    description: "Order management with PostgreSQL, Redis caching, and RabbitMQ events",
  },
  servers: [{ url: "http://localhost:3001", description: "Local" }],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": {
            description: "Service status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    service: { type: "string", example: "order-service" },
                    timestamp: { type: "string", format: "date-time" },
                    uptime: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/orders": {
      get: {
        tags: ["Orders"],
        summary: "List all orders",
        responses: {
          "200": {
            description: "Array of orders",
            content: { "application/json": { schema: { $ref: "#/components/schemas/OrderListResponse" } } },
          },
        },
      },
      post: {
        tags: ["Orders"],
        summary: "Create a new order",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateOrderInput" } } },
        },
        responses: {
          "201": {
            description: "Order created",
            content: { "application/json": { schema: { $ref: "#/components/schemas/OrderResponse" } } },
          },
          "400": { description: "Validation error" },
        },
      },
    },
    "/orders/{id}": {
      get: {
        tags: ["Orders"],
        summary: "Get order by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Order found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/OrderResponse" } } },
          },
          "404": { description: "Order not found" },
        },
      },
      patch: {
        tags: ["Orders"],
        summary: "Update order",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateOrderInput" } } },
        },
        responses: {
          "200": {
            description: "Order updated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/OrderResponse" } } },
          },
          "404": { description: "Order not found" },
        },
      },
    },
    "/orders/checkout": {
      post: {
        tags: ["Checkout"],
        summary: "Saga-based checkout (stock check + reserve + payment)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateOrderInput" } } },
        },
        responses: {
          "201": { description: "Checkout successful, order confirmed" },
          "422": { description: "Saga failed (stock or payment error)" },
          "400": { description: "Validation error" },
        },
      },
    },
  },
  components: {
    schemas: {
      OrderItem: {
        type: "object",
        required: ["productId", "name", "quantity", "price"],
        properties: {
          productId: { type: "string" },
          name: { type: "string" },
          quantity: { type: "integer", minimum: 1 },
          price: { type: "number", minimum: 0 },
        },
      },
      CreateOrderInput: {
        type: "object",
        required: ["customerName", "customerEmail", "items"],
        properties: {
          customerName: { type: "string", minLength: 1 },
          customerEmail: { type: "string", format: "email" },
          items: { type: "array", items: { $ref: "#/components/schemas/OrderItem" }, minItems: 1 },
        },
      },
      UpdateOrderInput: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"] },
        },
      },
      Order: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          customerName: { type: "string" },
          customerEmail: { type: "string" },
          items: { type: "array", items: { $ref: "#/components/schemas/OrderItem" } },
          totalAmount: { type: "number" },
          status: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      OrderResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: { $ref: "#/components/schemas/Order" },
        },
      },
      OrderListResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          data: { type: "array", items: { $ref: "#/components/schemas/Order" } },
        },
      },
    },
  },
};
