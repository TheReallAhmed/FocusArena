require("dotenv").config({ quiet: true });
const fs = require("node:fs");
const { Client } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing from .env");
  const migration = fs.readFileSync("migrations/0003_locale_and_shop_cosmetics.sql", "utf8");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    await client.query(migration);
    const result = await client.query(`
      select
        exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='locale') as locale,
        exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='equipped_logo') as logo,
        exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='equipped_color') as color,
        exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='equipped_icon') as icon,
        exists (select 1 from pg_constraint where conname='users_locale_chk') as locale_check,
        (select pg_get_constraintdef(oid) from pg_constraint where conname='user_perks_category_chk' limit 1) as category_def
    `);
    const row = result.rows[0];
    const definition = String(row?.category_def ?? "").toLowerCase();
    const categories = ["title", "frame", "logo", "color", "icon"];
    if (!row || !row.locale || !row.logo || !row.color || !row.icon || !row.locale_check || !categories.every((value) => definition.includes(value))) {
      throw new Error("Migration returned, but an expected locale/shop schema change is missing");
    }
    console.log("Migration 0003 applied and verified: locale, equipped cosmetics, and all five perk categories.");
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
