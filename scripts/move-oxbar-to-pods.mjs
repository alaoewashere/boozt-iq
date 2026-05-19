/**
 * One-off: move Oxbar + Oxbar G Turbo from Vape → Disposable Pods (DB + products).
 * Run: node scripts/move-oxbar-to-pods.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnv() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();

const PODS = "a0000001-0000-4000-8000-000000000003";
const OXBAR_SUB = "b0000001-0000-4000-8000-000002000005";
const OXBAR_GT_SUB = "b0000001-0000-4000-8000-000002000006";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supa = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function norm(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function isOxbarGT(category) {
  const c = norm(category);
  return (
    c === "oxbar g turbo" ||
    c === "vape / oxbar-g-turbo" ||
    c.startsWith("vape / oxbar-g-turbo") ||
    category === "Oxbar G Turbo"
  );
}

function isOxbarOnly(category) {
  if (isOxbarGT(category)) return false;
  const c = norm(category);
  if (c === "oxbar" || c === "vape / oxbar" || category === "Oxbar") return true;
  if (c.startsWith("vape / oxbar") && !c.includes("g-turbo") && !c.includes("oxbar-g-turbo"))
    return true;
  return false;
}

async function main() {
  const { error: e1 } = await supa
    .from("subcategories")
    .update({ category_id: PODS, sort_order: 34 })
    .eq("id", OXBAR_SUB);
  if (e1) throw e1;

  const { error: e2 } = await supa
    .from("subcategories")
    .update({ category_id: PODS, sort_order: 35 })
    .eq("id", OXBAR_GT_SUB);
  if (e2) throw e2;

  console.log("Subcategories moved to Disposable Pods.");

  const { data: products, error: e3 } = await supa
    .from("products")
    .select("id, category, product_name");
  if (e3) throw e3;

  let gt = 0;
  let ox = 0;
  for (const row of products ?? []) {
    let next = null;
    if (isOxbarGT(row.category)) next = "pods / oxbar-g-turbo";
    else if (isOxbarOnly(row.category)) next = "pods / oxbar";
    if (!next || next === row.category) continue;

    const { error } = await supa
      .from("products")
      .update({ category: next })
      .eq("id", row.id);
    if (error) throw error;
    if (next.includes("g-turbo")) gt++;
    else ox++;
  }

  console.log(`Products updated: ${ox} → pods/oxbar, ${gt} → pods/oxbar-g-turbo`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
