import type { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";

export interface OpenApiSpec {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers?: { url: string; description?: string }[];
  paths: Record<string, unknown>;
  components?: Record<string, unknown>;
}

export function mountSwagger(app: Hono, spec: OpenApiSpec) {
  app.get("/openapi.json", (c) => c.json(spec));
  app.get("/docs", swaggerUI({ url: "/openapi.json" }));
}
