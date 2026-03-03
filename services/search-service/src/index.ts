import { ensureIndex } from "./elastic";
import { startConsumer } from "./consumer";
import { mountSwagger } from "@ecommerce/shared";
import { spec } from "./openapi";
import app from "./routes";

const port = Number(process.env.PORT) || 3004;

mountSwagger(app, spec);

await ensureIndex();
await startConsumer();
console.log(`Search service starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
