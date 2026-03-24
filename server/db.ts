import "dotenv/config";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "../shared/schema.js";

type AppDatabase = NodePgDatabase<typeof schema>;

function resolveDatabaseUrl(): string | undefined {
  const candidates: Array<[string, string | undefined]> = [
    ["DATABASE_URL", process.env.DATABASE_URL],
    ["DATABASE_URL_UNPOOLED", process.env.DATABASE_URL_UNPOOLED],
    ["DATABASE_INTERNAL_URL", process.env.DATABASE_INTERNAL_URL],
    ["POSTGRES_URL", process.env.POSTGRES_URL],
    ["POSTGRES_URL_NON_POOLING", process.env.POSTGRES_URL_NON_POOLING],
    ["PG_URL", process.env.PG_URL],
  ];

  for (const [key, rawValue] of candidates) {
    const value = rawValue?.trim();
    if (!value) continue;

    try {
      return validatePostgresUrl(value);
    } catch (error) {
      console.warn(`Ignoring invalid ${key}: ${(error as Error).message}`);
    }
  }

  return undefined;
}

function validatePostgresUrl(databaseUrl: string): string {
  let parsed: URL;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error(
      "Invalid PostgreSQL URL format. Expected a full postgres:// or postgresql:// URL.",
    );
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("Invalid PostgreSQL protocol. Use postgres:// or postgresql://.");
  }

  if (!parsed.hostname || parsed.hostname.toLowerCase() === "base") {
    throw new Error(
      'Invalid PostgreSQL host "base". Set DATABASE_URL to your real PostgreSQL URL.',
    );
  }

  const hostname = parsed.hostname.toLowerCase();
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (process.env.VERCEL && localHosts.has(hostname)) {
    throw new Error(
      "Local PostgreSQL URLs are ignored on Vercel. Configure a hosted DATABASE_URL instead.",
    );
  }

  return databaseUrl;
}

function shouldUseSsl(databaseUrl: string): boolean | { rejectUnauthorized: false } {
  const mode = process.env.PGSSLMODE?.toLowerCase();
  if (mode === "disable") {
    return false;
  }

  if (mode === "require") {
    return { rejectUnauthorized: false };
  }

  try {
    const parsed = new URL(databaseUrl);
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
    if (localHosts.has(parsed.hostname.toLowerCase())) {
      return false;
    }
  } catch {
    // Ignore URL parsing errors here, validation already ran.
  }

  return { rejectUnauthorized: false };
}

const databaseUrl = resolveDatabaseUrl();

export const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      max: 10,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      ssl: shouldUseSsl(databaseUrl),
    })
  : null;

export const db: AppDatabase | null = pool ? drizzle(pool, { schema }) : null;
export const isPostgresConfigured = Boolean(databaseUrl);

let initPromise: Promise<void> | null = null;

async function initializeSchema(database: AppDatabase): Promise<void> {
  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS egg_collection (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      eggs_collected INTEGER NOT NULL,
      broken_eggs INTEGER NOT NULL DEFAULT 0,
      chicken_type TEXT NOT NULL DEFAULT 'Pure',
      shed TEXT NOT NULL,
      notes TEXT
    )
  `);
  await database.execute(sql`
    ALTER TABLE egg_collection
    ADD COLUMN IF NOT EXISTS chicken_type TEXT NOT NULL DEFAULT 'Pure'
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS egg_sales (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      eggs_sold INTEGER NOT NULL,
      price_per_egg NUMERIC NOT NULL,
      customer_name TEXT NOT NULL,
      total_amount NUMERIC NOT NULL,
      chicken_type TEXT NOT NULL DEFAULT 'Pure',
      sale_type TEXT NOT NULL DEFAULT 'Egg'
    )
  `);
  await database.execute(sql`
    ALTER TABLE egg_sales
    ADD COLUMN IF NOT EXISTS chicken_type TEXT NOT NULL DEFAULT 'Pure'
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS chicken_sales (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      chickens_sold INTEGER NOT NULL,
      price_per_chicken NUMERIC NOT NULL,
      customer_name TEXT NOT NULL,
      total_amount NUMERIC NOT NULL,
      chicken_type TEXT NOT NULL DEFAULT 'Pure',
      notes TEXT
    )
  `);
  await database.execute(sql`
    ALTER TABLE chicken_sales
    ADD COLUMN IF NOT EXISTS chicken_type TEXT NOT NULL DEFAULT 'Pure'
  `);
  await database.execute(sql`
    ALTER TABLE chicken_sales
    ADD COLUMN IF NOT EXISTS notes TEXT
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS chicken_management (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      total_chickens INTEGER NOT NULL,
      healthy INTEGER NOT NULL,
      sick INTEGER NOT NULL,
      dead INTEGER NOT NULL,
      chicks INTEGER NOT NULL,
      chicken_type TEXT NOT NULL DEFAULT 'Pure'
    )
  `);
  await database.execute(sql`
    ALTER TABLE chicken_management
    ADD COLUMN IF NOT EXISTS chicken_type TEXT NOT NULL DEFAULT 'Pure'
  `);

  await database.execute(sql`
    DROP TABLE IF EXISTS disease_records
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      purchase_date DATE NOT NULL,
      supplier TEXT NOT NULL,
      cost NUMERIC NOT NULL
    )
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      expense_type TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      description TEXT
    )
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS feed_metrics (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      opening_stock_kg NUMERIC NOT NULL DEFAULT 0,
      feed_added_kg NUMERIC NOT NULL DEFAULT 0,
      feed_consumed_kg NUMERIC NOT NULL,
      closing_stock_kg NUMERIC NOT NULL,
      feed_cost NUMERIC NOT NULL DEFAULT 0,
      notes TEXT
    )
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS alert_events (
      id SERIAL PRIMARY KEY,
      alert_date DATE NOT NULL,
      alert_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      alert_message TEXT NOT NULL,
      threshold_value NUMERIC NOT NULL DEFAULT 0,
      current_value NUMERIC NOT NULL DEFAULT 0,
      sms_sent BOOLEAN NOT NULL DEFAULT FALSE,
      sms_response TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT alert_events_unique_day_type UNIQUE(alert_date, alert_type)
    )
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id SERIAL PRIMARY KEY,
      sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
      phone TEXT NOT NULL,
      message_date DATE NOT NULL,
      eggs INTEGER NOT NULL,
      broken_eggs INTEGER NOT NULL DEFAULT 0,
      feed_consumed_kg NUMERIC NOT NULL DEFAULT 0,
      profit NUMERIC NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Normal',
      message_text TEXT NOT NULL,
      whatsapp_link TEXT NOT NULL
    )
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS fcm_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      token TEXT NOT NULL UNIQUE,
      device_label TEXT,
      user_agent TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await database.execute(sql`
    ALTER TABLE fcm_tokens
    ADD COLUMN IF NOT EXISTS device_label TEXT
  `);
  await database.execute(sql`
    ALTER TABLE fcm_tokens
    ADD COLUMN IF NOT EXISTS user_agent TEXT
  `);
  await database.execute(sql`
    ALTER TABLE fcm_tokens
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE
  `);
  await database.execute(sql`
    ALTER TABLE fcm_tokens
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP NOT NULL DEFAULT NOW()
  `);
  await database.execute(sql`
    ALTER TABLE fcm_tokens
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW()
  `);
  await database.execute(sql`
    ALTER TABLE fcm_tokens
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS vaccinations (
      id SERIAL PRIMARY KEY,
      vaccine_name TEXT NOT NULL,
      date DATE NOT NULL,
      chickens_vaccinated INTEGER NOT NULL,
      next_vaccination DATE NOT NULL
    )
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS sensor_data (
      id SERIAL PRIMARY KEY,
      temperature FLOAT,
      humidity FLOAT,
      ammonia FLOAT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS device_control (
      id SERIAL PRIMARY KEY,
      device TEXT NOT NULL,
      state TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function ensureDatabaseReady(): Promise<void> {
  if (!db) {
    throw new Error(
      "PostgreSQL is not configured. Set DATABASE_URL to enable database storage.",
    );
  }

  if (!initPromise) {
    initPromise = initializeSchema(db).catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  await initPromise;
}
