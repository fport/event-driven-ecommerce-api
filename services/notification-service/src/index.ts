import { connectMongo } from "./db";
import { startConsumer } from "./consumer";
import app from "./routes";

const port = Number(process.env.PORT) || 3002;

await connectMongo();
await startConsumer();
console.log(`Notification service starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
