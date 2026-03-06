import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import "dotenv/config";

const { Pool } = pg;

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

// Storage selects an in-memory fallback when DATABASE_URL is missing.
export const db = pool ? drizzle(pool, { schema }) : (null as any);
