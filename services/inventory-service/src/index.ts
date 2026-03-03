import { startConsumer } from "./consumer";
import { mountSwagger } from "@ecommerce/shared";
import { spec } from "./openapi";
import app from "./routes";

const port = Number(process.env.PORT) || 3003;

mountSwagger(app, spec);

await startConsumer();
console.log(`Inventory service starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
