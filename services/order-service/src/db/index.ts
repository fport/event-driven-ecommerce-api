import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const primaryUrl = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/orders";
const replicaUrl = process.env.DATABASE_REPLICA_URL || primaryUrl;

const primaryClient = postgres(primaryUrl);
const replicaClient = postgres(replicaUrl, { readonly: true });

/** Write operations (INSERT, UPDATE, DELETE) */
export const db = drizzle(primaryClient, { schema });

/** Read operations (SELECT) — routed to replica */
export const readDb = drizzle(replicaClient, { schema });
