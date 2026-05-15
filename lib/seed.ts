/**
 * Optional: ensure Supabase has category taxonomy (normally applied via SQL migration).
 * Run: npx tsx --env-file=.env.local lib/seed.ts
 */
import "./load-env";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";

function assertEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }
}

async function main() {
  assertEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
  const supa = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { count, error: cErr } = await supa
    .from("categories")
    .select("*", { count: "exact", head: true });
  if (cErr) throw cErr;

  if ((count ?? 0) > 0) {
    console.log(
      `[seed] categories already present (${count}). Apply supabase/migrations if you need a fresh schema.`
    );
    return;
  }

  const sqlPath = join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260210120000_boozt_initial.sql"
  );
  if (!existsSync(sqlPath)) {
    throw new Error(`Missing migration file: ${sqlPath}`);
  }
  console.log(
    "[seed] No categories in Supabase. Run the SQL in supabase/migrations/20260210120000_boozt_initial.sql in the Supabase SQL editor (Dashboard → SQL), then re-run npm run seed if needed."
  );
  console.log(readFileSync(sqlPath, "utf8").slice(0, 400) + "\n... (truncated)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
