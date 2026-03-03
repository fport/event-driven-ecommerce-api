import type { OpenApiSpec } from "@ecommerce/shared";

export const spec: OpenApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Notification Service",
    version: "1.0.0",
    description: "Event-driven notification storage (MongoDB) — consumes order events from RabbitMQ",
  },
  servers: [{ url: "http://localhost:3002", description: "Local" }],
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
                    service: { type: "string", example: "notification-service" },
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
    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List notifications",
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", default: 50 },
            description: "Max number of notifications to return",
          },
        ],
        responses: {
          "200": {
            description: "Array of notifications",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { type: "array", items: { $ref: "#/components/schemas/Notification" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/notifications/{orderId}": {
      get: {
        tags: ["Notifications"],
        summary: "Get notifications for a specific order",
        parameters: [{ name: "orderId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Notifications for the given order",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { type: "array", items: { $ref: "#/components/schemas/Notification" } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Notification: {
        type: "object",
        properties: {
          _id: { type: "string" },
          orderId: { type: "string" },
          type: { type: "string", example: "order.created" },
          message: { type: "string" },
          sentAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
};
