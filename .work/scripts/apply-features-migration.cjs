require("dotenv").config({ quiet: true });
const fs = require("node:fs");
const { Client } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing from .env");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const migration = fs.readFileSync("migrations/0001_focusarena_features.sql", "utf8");
    await client.query(migration);
    const result = await client.query(`
      select
        to_regclass('public.focus_session_runs') as runs,
        to_regclass('public.distraction_events') as distractions,
        to_regclass('public.duels') as duels,
        to_regclass('public.deep_work_journal') as journal
    `);
    const row = result.rows[0];
    if (!row || Object.values(row).some((value) => value === null)) {
      throw new Error("Migration returned, but one or more feature tables are missing");
    }
    console.log("Migration completed; all four feature tables are present.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  const message = String(error?.message ?? "Unknown database error")
    .replace(process.env.DATABASE_URL ?? "\u0000", "[connection hidden]")
    .replace(/(postgres(?:ql)?:\/\/)[^@\s]+@/gi, "$1[credentials hidden]@");
  console.error(`Migration failed: ${message}`);
  if (error?.code) console.error(`PostgreSQL error code: ${error.code}`);
  process.exitCode = 1;
});
