/**
 * Import a legacy "Boozt new *.csv" file (no header) into Supabase `public.products`.
 *
 * Columns: group, item, wholesale IQD, retail IQD
 *
 *   npm run import:boozt6                    # write (with images → public/catalog-import)
 *   npm run import:boozt6 -- --dry-run
 *   npm run import:boozt6 -- path/to.csv --no-images   # skip image copy
 */
import "./load-env";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import {
  publishImageUnderPublic,
  resolveDefaultBooztImagePath,
} from "./catalog-publish-image";

type Row = {
  group: string;
  item: string;
  wholesale: string;
  retail: string;
};

function parseCsv(raw: string): Row[] {
  const text = raw.replace(/^\uFEFF/, "");
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [group = "", item = "", wholesale = "", retail = ""] =
        line.split(",");
      return {
        group: group.trim(),
        item: item.trim(),
        wholesale: wholesale.trim(),
        retail: retail.trim(),
      };
    });
}

function parsePriceIqd(text: string): number {
  const digits = String(text ?? "").replace(/[^\d]/g, "");
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function getSupabaseForScript() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function main() {
  const csvPath =
    process.argv.find((a) => !a.startsWith("-") && /\.csv$/i.test(a)) ||
    "Boozt new 6.csv";
  const dryRun = process.argv.includes("--dry-run");
  const withImages = !process.argv.includes("--no-images");

  const imagesDirFlag = process.argv.find((a) => a.startsWith("--images-dir="));
  const imagesDir = imagesDirFlag
    ? imagesDirFlag.split("=").slice(1).join("=").trim()
    : join(process.cwd(), "images");

  const abs = resolve(process.cwd(), csvPath);
  if (!existsSync(abs)) throw new Error(`CSV not found: ${abs}`);

  const supa = getSupabaseForScript();
  const rows = parseCsv(readFileSync(abs, "utf8"));
  if (rows.length === 0) throw new Error(`No rows in: ${csvPath}`);

  const { data: existingRows } = await supa.from("products").select("id");
  const existingIds = new Set(
    (existingRows ?? []).map((r: { id: number }) => r.id)
  );

  let nextId = existingIds.size > 0 ? Math.max(...existingIds) + 1 : 1;
  let created = 0;
  let skippedInvalid = 0;
  let missingImages = 0;

  const toInsert: {
    id: number;
    product_name: string;
    category: string | null;
    weight: string | null;
    price: string;
    image: string | null;
  }[] = [];

  for (const r of rows) {
    const retail = parsePriceIqd(r.retail);
    const wholesale = parsePriceIqd(r.wholesale);
    const price = retail > 0 ? retail : wholesale;
    if (!r.group || price <= 0) {
      skippedInvalid++;
      continue;
    }
    const productName = [r.group, r.item].filter(Boolean).join(" - ").trim();
    let imageUrl: string | null = null;
    if (withImages) {
      const absImg = resolveDefaultBooztImagePath(imagesDir, r.group, r.item);
      if (absImg && !dryRun) {
        imageUrl = publishImageUnderPublic(
          absImg,
          `boozt-${nextId}-${price}`
        );
      } else if (!absImg) {
        missingImages++;
      }
    }
    toInsert.push({
      id: nextId++,
      product_name: productName,
      category: r.group || null,
      weight: null,
      price: String(price),
      image: imageUrl,
    });
    created++;
  }

  if (!dryRun && toInsert.length > 0) {
    const { error } = await supa
      .from("products")
      .upsert(toInsert, { onConflict: "id" });
    if (error) throw error;
  }

  console.log(
    JSON.stringify(
      {
        file: csvPath,
        rowsParsed: rows.length,
        created,
        skippedInvalid,
        missingImages,
        withImages,
        mode: dryRun ? "dry-run" : "write",
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
