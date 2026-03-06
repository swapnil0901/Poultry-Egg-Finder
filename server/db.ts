import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import "dotenv/config";

const { Pool } = pg;
const isProduction = process.env.NODE_ENV !== "development";
const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.DATABASE_INTERNAL_URL ||
  process.env.POSTGRES_URL ||
  process.env.PGURL;

if (isProduction && !databaseUrl) {
  throw new Error(
    "DATABASE_URL is required in production. Set DATABASE_URL (or DATABASE_INTERNAL_URL/POSTGRES_URL).",
  );
}

const shouldUseSsl =
  (databaseUrl?.includes("render.com") ?? false) ||
  process.env.PGSSL === "true";

export const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  : null;

// Storage selects an in-memory fallback when DATABASE_URL is missing.
export const db = pool ? drizzle(pool, { schema }) : (null as any);
