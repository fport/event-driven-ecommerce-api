import { runMigrations } from "./db/migrate";
import app from "./routes";

const port = Number(process.env.PORT) || 3001;

await runMigrations();
console.log(`Order service starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
