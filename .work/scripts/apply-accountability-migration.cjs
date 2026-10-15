require("dotenv").config({ quiet: true });
const fs = require("node:fs");
const { Client } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing from .env");
  const migration = fs.readFileSync("migrations/0002_commitment_energy_verification_perks.sql", "utf8");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    await client.query(migration);
    const result = await client.query(`
      select
        to_regclass('public.session_commitments') as commitments,
        to_regclass('public.proof_challenges') as proofs,
        to_regclass('public.user_perks') as perks,
        exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='xp_balance') as has_xp_balance,
        exists (select 1 from information_schema.columns where table_schema='public' and table_name='focus_sessions' and column_name='energy_rating') as has_energy,
        exists (select 1 from pg_constraint where conname='focus_runs_status_chk') as has_run_status_check,
        exists (select 1 from pg_constraint where conname='users_xp_balance_nonnegative_chk') as has_nonnegative_xp_check
    `);
    const row = result.rows[0];
    if (!row || !row.commitments || !row.proofs || !row.perks || !row.has_xp_balance || !row.has_energy || !row.has_run_status_check || !row.has_nonnegative_xp_check) {
      throw new Error("Migration returned, but one or more expected schema changes are missing");
    }
    console.log("Migration 0002 applied; commitment, proof, perk, energy, and XP-balance schema verified.");
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
