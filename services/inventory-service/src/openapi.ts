import type { OpenApiSpec } from "@ecommerce/shared";

export const spec: OpenApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Inventory Service",
    version: "1.0.0",
    description: "Product stock management (Redis) — consumes order events to decrease stock",
  },
  servers: [{ url: "http://localhost:3003", description: "Local" }],
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
                    service: { type: "string", example: "inventory-service" },
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
    "/products": {
      get: {
        tags: ["Products"],
        summary: "List all products",
        responses: {
          "200": {
            description: "Array of products",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { type: "array", items: { $ref: "#/components/schemas/Product" } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Products"],
        summary: "Create or update a product",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ProductInput" } } },
        },
        responses: {
          "201": {
            description: "Product created / updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Product" },
                  },
                },
              },
            },
          },
          "400": { description: "Validation error" },
        },
      },
    },
    "/products/{id}": {
      get: {
        tags: ["Products"],
        summary: "Get product by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Product found",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Product" },
                  },
                },
              },
            },
          },
          "404": { description: "Product not found" },
        },
      },
      patch: {
        tags: ["Products"],
        summary: "Adjust stock",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["stockChange"],
                properties: {
                  stockChange: { type: "integer", description: "Positive to add, negative to subtract" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Stock updated" },
          "400": { description: "Insufficient stock or invalid input" },
          "404": { description: "Product not found" },
        },
      },
      delete: {
        tags: ["Products"],
        summary: "Delete product",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Product deleted" },
          "404": { description: "Product not found" },
        },
      },
    },
  },
  components: {
    schemas: {
      Product: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          stock: { type: "integer" },
          price: { type: "number" },
        },
      },
      ProductInput: {
        type: "object",
        required: ["id", "name", "stock", "price"],
        properties: {
          id: { type: "string", minLength: 1 },
          name: { type: "string", minLength: 1 },
          stock: { type: "integer", minimum: 0 },
          price: { type: "number", exclusiveMinimum: 0 },
        },
      },
    },
  },
};
