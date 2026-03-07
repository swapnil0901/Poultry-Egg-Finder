import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import "dotenv/config";

function resolveDatabaseUrl(): string | undefined {
  const candidates: Array<[string, string | undefined]> = [
    ["DATABASE_URL", process.env.DATABASE_URL],
    ["DATABASE_INTERNAL_URL", process.env.DATABASE_INTERNAL_URL],
    ["POSTGRES_URL", process.env.POSTGRES_URL],
    ["PGURL", process.env.PGURL],
  ];

  for (const [key, rawValue] of candidates) {
    const value = rawValue?.trim();
    if (!value) continue;

    try {
      return validateDatabaseUrl(value);
    } catch (error) {
      console.warn(`Ignoring invalid ${key}: ${(error as Error).message}`);
    }
  }

  return undefined;
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
      'Invalid DATABASE_URL host "base". Set DATABASE_URL to your real Postgres URL.',
    );
  }

  return databaseUrl;
}

function resolveSslPreference(databaseUrl: string | undefined, isProduction: boolean): boolean {
  const pgSsl = process.env.PGSSL?.trim().toLowerCase();
  if (pgSsl === "true") return true;
  if (pgSsl === "false") return false;
  if (!databaseUrl) return false;

  const parsed = new URL(databaseUrl);
  const sslMode = parsed.searchParams.get("sslmode")?.toLowerCase();
  if (sslMode && sslMode !== "disable") {
    return true;
  }

  const host = parsed.hostname.toLowerCase();
  const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  return isProduction && !isLocalHost;
}

const { Pool } = pg;
const isProduction = process.env.NODE_ENV !== "development";
const databaseUrl = resolveDatabaseUrl();

if (isProduction && !databaseUrl) {
  throw new Error(
    "DATABASE_URL is required in production. Set DATABASE_URL (or DATABASE_INTERNAL_URL/POSTGRES_URL).",
  );
}

const shouldUseSsl = resolveSslPreference(databaseUrl, isProduction);

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
