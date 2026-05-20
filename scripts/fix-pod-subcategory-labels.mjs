/**
 * Apply pods subcategory labels on products.category (pods / slug).
 * Run: node scripts/fix-pod-subcategory-labels.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1].trim()]) process.env[m[1].trim()] = v;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const supa = createClient(url, key);

const steps = [
  {
    label: "vozol vista (ids 427, 428)",
    run: () => supa.from("products").update({ category: "pods / vozol" }).in("id", [427, 428]),
  },
  {
    label: "oxbar svopp/svoop",
    run: async () => {
      const { data } = await supa
        .from("products")
        .select("id, product_name, category")
        .or(
          "category.ilike.%oxbar%svoop%,category.ilike.%oxbar%svopp%,product_name.ilike.%Oxbar Svopp%,product_name.ilike.%Oxbar Svoop%"
        );
      const ids = (data ?? []).map((r) => r.id);
      if (!ids.length) return { count: 0 };
      const { error } = await supa
        .from("products")
        .update({ category: "pods / oxbar-svopp" })
        .in("id", ids);
      if (error) throw error;
      return { count: ids.length };
    },
  },
  {
    label: "oxbar pod (excl svopp/vozol)",
    run: async () => {
      const { data } = await supa
        .from("products")
        .select("id, product_name, category")
        .or("category.ilike.Oxbar Pod%,product_name.ilike.%Oxbar Pod%");
      const ids = (data ?? [])
        .filter((r) => {
          const t = `${r.category} ${r.product_name}`.toLowerCase();
          return (
            !t.includes("svopp") &&
            !t.includes("svoop") &&
            !t.includes("vozol")
          );
        })
        .map((r) => r.id);
      if (!ids.length) return { count: 0 };
      const { error } = await supa
        .from("products")
        .update({ category: "pods / oxbar-pod" })
        .in("id", ids);
      if (error) throw error;
      return { count: ids.length };
    },
  },
];

for (const step of steps) {
  const res = await step.run();
  if (res.error) {
    console.error(step.label, res.error.message);
    process.exit(1);
  }
  console.log(step.label, "→", res.count ?? res.data?.length ?? "ok");
}

console.log("Done.");
