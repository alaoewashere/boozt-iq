import { getSupabaseAdmin } from "../lib/supabase/admin";
import { rowToProductDoc } from "../lib/supabase/product-map";
import { SUBCATEGORY_IDS } from "../lib/supabase/catalog-ids";

async function main() {
  const supa = getSupabaseAdmin();
  const { data, error } = await supa
    .from("products")
    .select("id, product_name, category");
  if (error) throw error;

  const docs = (data ?? []).map((r) => rowToProductDoc(r as any));

  for (const slug of ["vozol", "oxbar-pod", "oxbar-svopp", "vozol-gear"]) {
    const id = SUBCATEGORY_IDS[slug as keyof typeof SUBCATEGORY_IDS];
    const n = docs.filter((d) => d.subcategoryId === id).length;
    console.log(`${slug}: ${n}`);
  }

  const podId = SUBCATEGORY_IDS["oxbar-pod"];
  const bad = docs.filter(
    (d) => d.subcategoryId === podId && /svopp|svoop/i.test(`${d.name_en}`)
  );
  console.log(`svopp in oxbar-pod: ${bad.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
