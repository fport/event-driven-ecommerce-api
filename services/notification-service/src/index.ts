import { connectMongo } from "./db";
import { startConsumer } from "./consumer";
import { mountSwagger } from "@ecommerce/shared";
import { spec } from "./openapi";
import app from "./routes";

const port = Number(process.env.PORT) || 3002;

mountSwagger(app, spec);

await connectMongo();
await startConsumer();
console.log(`Notification service starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
