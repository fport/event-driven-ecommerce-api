import { runMigrations } from "./db/migrate";
import { connectProducer } from "./events/producer";
import app from "./routes";

const port = Number(process.env.PORT) || 3001;

await runMigrations();
await connectProducer();
console.log(`Order service starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
