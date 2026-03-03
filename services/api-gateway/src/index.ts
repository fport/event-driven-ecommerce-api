import app from "./routes";

const port = Number(process.env.PORT) || 3000;

console.log(`API Gateway starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
