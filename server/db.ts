import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import "dotenv/config";

function resolveDatabaseUrl(): string | undefined {
  const candidate =
    process.env.DATABASE_URL ||
    process.env.DATABASE_INTERNAL_URL ||
    process.env.POSTGRES_URL ||
    process.env.PGURL;

  const trimmed = candidate?.trim();
  return trimmed || undefined;
}

function validateDatabaseUrl(databaseUrl: string): string {
  let parsed: URL;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("Invalid DATABASE_URL format. Expected a full postgres:// URL.");
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("Invalid DATABASE_URL protocol. Use postgres:// or postgresql://.");
  }

  if (!parsed.hostname || parsed.hostname.toLowerCase() === "base") {
    throw new Error(
      'Invalid DATABASE_URL host "base". Set DATABASE_URL to your real Render Postgres URL.',
    );
  }

  return databaseUrl;
}

const { Pool } = pg;
const isProduction = process.env.NODE_ENV !== "development";
const rawDatabaseUrl = resolveDatabaseUrl();
const databaseUrl = rawDatabaseUrl ? validateDatabaseUrl(rawDatabaseUrl) : undefined;

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
