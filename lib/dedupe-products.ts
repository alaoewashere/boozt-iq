/**
 * Remove duplicate products (same name + image + price + weight).
 * Rows listed in products.csv (by id) are never deleted.
 *
 *   npm run dedupe:products           # dry-run
 *   npm run dedupe:products:apply     # delete
 */
import "./load-env";
import { createClient } from "@supabase/supabase-js";
import { loadProductsCsvIds } from "./products-csv-catalog";

type Row = {
  id: number;
  product_name: string;
  image: string | null;
  price: string | null;
  weight: string | null;
};

function normName(raw: string): string {
  return String(raw ?? "").trim();
}

function normImage(raw: string | null): string {
  return String(raw ?? "").trim();
}

function normPrice(raw: string | null): string {
  return String(raw ?? "").replace(/[^\d]/g, "");
}

function normWeight(raw: string | null): string {
  return String(raw ?? "").trim().toLowerCase();
}

function groupKey(row: Row): string {
  return [
    normName(row.product_name),
    normImage(row.image),
    normPrice(row.price),
    normWeight(row.weight),
  ].join("\0");
}

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  const protectedIds = loadProductsCsvIds();
  console.log(`Protected products.csv ids: ${protectedIds.size}`);

  const supa = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supa
    .from("products")
    .select("id, product_name, image, price, weight")
    .order("id", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as Row[];
  const groups = new Map<string, Row[]>();

  for (const row of rows) {
    const key = groupKey(row);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const toDelete: number[] = [];
  let duplicateGroups = 0;
  let skippedProtected = 0;

  for (const [, list] of groups) {
    if (list.length <= 1) continue;
    duplicateGroups++;
    const sorted = [...list].sort((a, b) => a.id - b.id);
    const keep = sorted.find((r) => protectedIds.has(r.id)) ?? sorted[0]!;
    for (const row of sorted) {
      if (row.id === keep.id) continue;
      if (protectedIds.has(row.id)) {
        skippedProtected++;
        continue;
      }
      toDelete.push(row.id);
    }
  }

  console.log(`Products scanned: ${rows.length}`);
  console.log(`Duplicate groups: ${duplicateGroups}`);
  console.log(`Rows to remove: ${toDelete.length}`);
  if (skippedProtected > 0) {
    console.log(`Skipped (protected by products.csv): ${skippedProtected}`);
  }

  if (toDelete.length === 0) {
    console.log("No duplicates to remove.");
    return;
  }

  if (!apply) {
    console.log("\nDry run — no rows deleted. Run: npm run dedupe:products:apply");
    return;
  }

  const chunkSize = 100;
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += chunkSize) {
    const chunk = toDelete.slice(i, i + chunkSize);
    const { error: delErr } = await supa.from("products").delete().in("id", chunk);
    if (delErr) throw delErr;
    deleted += chunk.length;
    console.log(`Deleted ${deleted}/${toDelete.length}…`);
  }

  console.log(`Done. Removed ${deleted} duplicate product(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
