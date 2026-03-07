import { defineConfig } from "drizzle-kit";
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

const rawDatabaseUrl = resolveDatabaseUrl();
const databaseUrl = rawDatabaseUrl ? validateDatabaseUrl(rawDatabaseUrl) : undefined;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is missing. Set DATABASE_URL (or DATABASE_INTERNAL_URL/POSTGRES_URL).",
  );
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
