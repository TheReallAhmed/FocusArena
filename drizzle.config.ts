import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Schema push config.
 * - Reads DATABASE_URL from `.env` (loaded via dotenv).
 * - To push tables to a production database (e.g. Neon), either paste the
 *   Neon URL into `.env`, or run:
 *   DATABASE_URL="postgresql://...neon.tech/..." npx drizzle-kit push
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  },
});
