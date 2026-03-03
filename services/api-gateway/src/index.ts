import { mountSwagger } from "@ecommerce/shared";
import { spec } from "./openapi";
import app from "./routes";

const port = Number(process.env.PORT) || 3000;

mountSwagger(app, spec);

console.log(`API Gateway starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
