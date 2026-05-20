/**
 * Audit Vozol / Oxbar Pod / Oxbar Svopp product assignments (inferred from category + name).
 * Run: node scripts/audit-pod-subcategories.mjs
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

const SUB = {
  vozol: "b0000001-0000-4000-8000-000003000005",
  "oxbar-pod": "b0000001-0000-4000-8000-000003000006",
  "oxbar-svopp": "b0000001-0000-4000-8000-000003000021",
  "vozol-gear": "b0000001-0000-4000-8000-000003000026",
};

function parseName(raw) {
  const s = String(raw ?? "").trim();
  if (!s.startsWith("{")) return s;
  try {
    const o = JSON.parse(s);
    return String(o.en ?? o.ar ?? "").trim();
  } catch {
    return s;
  }
}

/** Minimal mirror of lib/supabase/product-map.ts (keep in sync when auditing). */
function inferSub(cat, productName) {
  const name = parseName(productName);
  const t = `${String(cat ?? "").trim()} ${name}`.toLowerCase();

  const slash = String(cat ?? "")
    .trim()
    .match(/^([a-z0-9-]+)\s*\/\s*([a-z0-9-]+)$/i);
  if (slash) return slash[2].toLowerCase();

  if (t.includes("oxbar") && t.includes("g turbo")) return "oxbar-g-turbo";

  const isSvopp =
    t.includes("oxbar") &&
    (t.includes("svopp") ||
      t.includes("svoop") ||
      /\boxbar\s+svoop\b/i.test(t) ||
      /\boxbar\s+svopp\b/i.test(t));
  if (isSvopp) return "oxbar-svopp";

  if (
    (t.includes("pod") || t.includes("بود")) &&
    (t.includes("oxbar") || t.includes("oxbar pod")) &&
    !t.includes("svopp") &&
    !t.includes("svoop")
  ) {
    return "oxbar-pod";
  }

  if ((t.includes("vozol") && t.includes("gear")) || t === "vozol gear")
    return "vozol-gear";
  if (t.includes("vozol star") || (t.includes("vozol") && t.includes("star")))
    return "vozol-star-40000";
  if (t.includes("vozol")) return "vozol";

  return "(other)";
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const supa = createClient(url, key);
const { data, error } = await supa
  .from("products")
  .select("id, product_name, category")
  .limit(2000);
if (error) throw error;

const counts = {};
const misPod = [];
const misVozol = [];

for (const row of data ?? []) {
  const sub = inferSub(row.category, row.product_name);
  counts[sub] = (counts[sub] ?? 0) + 1;

  if (sub === "oxbar-pod" && /svopp|svoop/i.test(`${row.category} ${parseName(row.product_name)}`)) {
    misPod.push(row);
  }
  if (/vozol/i.test(`${row.category} ${parseName(row.product_name)}`) && sub !== "vozol" && sub !== "vozol-gear" && sub !== "vozol-star-40000") {
    /* ok */
  }
}

console.log("Counts:", counts);
console.log("vozol:", counts.vozol ?? 0);
console.log("oxbar-pod:", counts["oxbar-pod"] ?? 0);
console.log("oxbar-svopp:", counts["oxbar-svopp"] ?? 0);
console.log("oxbar-pod misfiled svopp (old rules):", misPod.length);

const vozolPlain = (data ?? []).filter(
  (r) => inferSub(r.category, r.product_name) === "vozol"
);
console.log("\nPlain Vozol products:");
for (const r of vozolPlain) {
  console.log(`  ${r.id} | ${r.category} | ${parseName(r.product_name).slice(0, 55)}`);
}

const inPod = (data ?? []).filter(
  (r) => inferSub(r.category, r.product_name) === "oxbar-pod"
);
const svoppInPod = inPod.filter((r) =>
  /svopp|svoop/i.test(`${r.category} ${parseName(r.product_name)}`)
);
console.log("\nSvopp/Svoop still in oxbar-pod:", svoppInPod.length);
for (const r of svoppInPod.slice(0, 8)) {
  console.log(`  ${r.id} | ${r.category} | ${parseName(r.product_name).slice(0, 55)}`);
}
