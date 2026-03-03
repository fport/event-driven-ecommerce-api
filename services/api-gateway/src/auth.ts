import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: {
    type: "sqlite",
    url: process.env.AUTH_DB_URL || "./auth.db",
  },
  secret: process.env.AUTH_SECRET || "dev-secret-change-in-production",
  baseURL: process.env.BASE_URL || "http://localhost:3000",
  trustedOrigins: [process.env.BASE_URL || "http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});
