/**
 * Delete every row in `public.products`, then import only `products.csv`
 * (same flags as `npm run import:products-csv`).
 *
 *   npm run import:products-only
 */
import "./load-env";
import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import { join } from "path";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }
  const supa = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: delErr } = await supa.from("products").delete().gte("id", 0);
  if (delErr) throw delErr;

  const script = join(process.cwd(), "lib", "import-products-from-products-csv.ts");
  execSync(
    `npx tsx --env-file=.env.local "${script}" products.csv --upsert --images-dir=images --public-images`,
    { stdio: "inherit", cwd: process.cwd() }
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
