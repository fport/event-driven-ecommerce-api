import type { OpenApiSpec } from "@ecommerce/shared";

export const spec: OpenApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Search Service",
    version: "1.0.0",
    description: "Full-text order search (ElasticSearch) — indexes order events via RabbitMQ",
  },
  servers: [{ url: "http://localhost:3004", description: "Local" }],
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
                    service: { type: "string", example: "search-service" },
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
    "/search": {
      get: {
        tags: ["Search"],
        summary: "Full-text search orders",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Search query (fuzzy)" },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"] },
            description: "Filter by order status",
          },
          { name: "from", in: "query", schema: { type: "integer", default: 0 }, description: "Offset" },
          { name: "size", in: "query", schema: { type: "integer", default: 20 }, description: "Limit" },
        ],
        responses: {
          "200": {
            description: "Search results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        total: { type: "integer" },
                        hits: { type: "array", items: { type: "object" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/search/stats": {
      get: {
        tags: ["Search"],
        summary: "Aggregated order stats (status counts, revenue)",
        responses: {
          "200": {
            description: "Aggregation results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { type: "object" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
