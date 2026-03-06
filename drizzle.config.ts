import { defineConfig } from "drizzle-kit";
import "dotenv/config";

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.DATABASE_INTERNAL_URL ||
  process.env.POSTGRES_URL ||
  process.env.PGURL;

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
