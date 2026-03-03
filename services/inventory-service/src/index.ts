import { startConsumer } from "./consumer";
import app from "./routes";

const port = Number(process.env.PORT) || 3003;

await startConsumer();
console.log(`Inventory service starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
