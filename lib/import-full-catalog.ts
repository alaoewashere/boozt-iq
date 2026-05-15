/**
 * Full catalog import: `products.csv` (header, IDs, molasses images) +
 * all `Boozt new *.csv` files (4-column Arabic price lists) with default images.
 *
 * Images:
 * - products.csv: uses `images/` + same stem rules as `import-products-from-products-csv.ts`
 * - Boozt CSVs: copies `images/1.jpeg` (hookah/molasses) or `images/2.jpeg` (vape/pods/board)
 *   into `public/catalog-import/` so `next/image` can serve them.
 *
 * Usage:
 *   npm run import:full-catalog -- --replace-all
 *       Wipes `products`, imports `products.csv` (ids 1–48 + molasses images), then all `Boozt new *.csv`
 *       rows (auto ids) with default images. Use this once for a clean full catalog.
 *   npm run import:full-catalog
 *       Append only: new rows from all `Boozt new *.csv` (deduped by name+price). Does not touch existing rows.
 *   npm run import:full-catalog -- --with-products-csv
 *       Also upserts `products.csv` (overwrites ids 1–48 if they already exist — use with care).
 *   npm run import:full-catalog -- --dry-run
 */
import "./load-env";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, resolve, extname } from "path";
import { createClient } from "@supabase/supabase-js";
import { uploadImage } from "./cloudinary";
import {
  publishImageUnderPublic,
  resolveDefaultBooztImagePath,
} from "./catalog-publish-image";

type CsvRow = Record<string, string>;

function normalizeHeader(h: string): string {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9 ]+/g, "");
}

function parseCsvQuoted(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  const s = raw.replace(/^\uFEFF/, "");

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (inQuotes) {
      if (ch === '"') {
        const next = s[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cur);
      cur = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cur);
      cur = "";
      const trimmed = row.map((c) => c.trim());
      if (trimmed.some(Boolean)) rows.push(trimmed);
      row = [];
      continue;
    }
    if (ch === "\r") continue;
    cur += ch;
  }
  row.push(cur);
  const trimmed = row.map((c) => c.trim());
  if (trimmed.some(Boolean)) rows.push(trimmed);
  return rows;
}

function rowsToObjects(table: string[][]): CsvRow[] {
  if (table.length === 0) return [];
  const headersRaw = table[0] ?? [];
  const headers = headersRaw.map(normalizeHeader);
  const out: CsvRow[] = [];
  for (const r of table.slice(1)) {
    const o: CsvRow = {};
    for (let i = 0; i < headers.length; i++) {
      const k = headers[i];
      if (!k) continue;
      o[k] = String(r[i] ?? "").trim();
    }
    if (Object.values(o).some((v) => v && v.trim())) out.push(o);
  }
  return out;
}

function parseIqdPrice(v: string): number {
  const digits = String(v || "").replace(/[^\d]/g, "");
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

function molassesCsvImageStem(
  externalId: string,
  productName?: string
): string | null {
  const name = String(productName ?? "").toLowerCase();
  if (name.includes("mint") && name.includes("lemon")) return "2";

  const n = Number(String(externalId).trim());
  if (!Number.isFinite(n)) return null;
  if (n >= 1 && n <= 37) return "1";
  if (n >= 38 && n <= 40) return "2";
  if (n >= 41 && n <= 48) return "1";
  return null;
}

function resolveImageFile(
  imagesDir: string,
  opts: { imageValue: string; externalId: string; productName?: string }
): string | null {
  const raw = String(opts.imageValue || "").trim();
  const v = raw.toLowerCase() === "picture" ? "" : raw;
  if (v) {
    const norm = v.replace(/\\/g, "/");
    if (/^images\//i.test(norm)) {
      const fromRepo = resolve(process.cwd(), norm);
      if (existsSync(fromRepo) && !fromRepo.endsWith("\\") && !fromRepo.endsWith("/")) {
        return fromRepo;
      }
    }
  }
  const stem = molassesCsvImageStem(opts.externalId, opts.productName);
  const candidates = Array.from(
    new Set(
      [stem, v, opts.externalId].filter((x): x is string => Boolean(x && String(x).trim()))
    )
  );
  for (const stemOrId of candidates) {
    const base = resolve(imagesDir, stemOrId);
    if (existsSync(base) && !base.endsWith("\\") && !base.endsWith("/")) return base;
    if (extname(base)) continue;
    for (const ext of [".jpeg", ".jpg", ".png", ".webp"]) {
      const candidate = base + ext;
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

async function resolveImageUrl(opts: {
  mode: "cloudinary" | "public";
  absImagePath: string;
  stemKey: string;
}): Promise<string> {
  if (opts.mode === "public") {
    return publishImageUnderPublic(opts.absImagePath, opts.stemKey);
  }
  const buf = readFileSync(opts.absImagePath);
  const uploaded = await uploadImage(buf);
  return uploaded.url;
}

function imageStemKey(externalId: string, productName?: string): string {
  return (
    molassesCsvImageStem(externalId, productName) ??
    externalId.replace(/[^\dA-Za-z_-]+/g, "-").slice(0, 40)
  );
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

function normDedupeKey(productName: string, price: string): string {
  return `${String(productName ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")}|${String(price ?? "").trim()}`;
}

type Boozt4 = { group: string; item: string; wholesale: string; retail: string };

function parseBoozt4Col(raw: string): Boozt4[] {
  const text = raw.replace(/^\uFEFF/, "");
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [group = "", item = "", wholesale = "", retail = ""] = line.split(",");
      return {
        group: group.trim(),
        item: item.trim(),
        wholesale: wholesale.trim(),
        retail: retail.trim(),
      };
    });
}

function listBooztCsvFiles(root: string): string[] {
  return readdirSync(root)
    .filter(
      (n) =>
        /^Boozt new \d+\.csv$/i.test(n) ||
        /^Boozt new.*\.csv$/i.test(n)
    )
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((n) => join(root, n));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const replaceAll = process.argv.includes("--replace-all");
  const withProductsCsv =
    replaceAll || process.argv.includes("--with-products-csv");
  const usePublicImages = process.argv.includes("--public-images");
  const imageMode = usePublicImages ? ("public" as const) : ("cloudinary" as const);

  const imagesDirFlag = process.argv.find((a) => a.startsWith("--images-dir="));
  const imagesDir = imagesDirFlag
    ? imagesDirFlag.split("=").slice(1).join("=").trim()
    : join(process.cwd(), "images");

  const supa = getSupabaseForScript();
  const cwd = process.cwd();

  const stats = {
    wiped: false,
    productsCsv: { upserted: 0, skippedInvalid: 0, missingImages: 0 },
    boozt: { files: 0, inserted: 0, skippedDup: 0, skippedInvalid: 0, missingImages: 0 },
    mode: dryRun ? "dry-run" : "write",
  };

  if (replaceAll) {
    if (!dryRun) {
      const { error } = await supa.from("products").delete().gte("id", 0);
      if (error) throw error;
      stats.wiped = true;
    } else {
      stats.wiped = true;
    }
  }

  const dedupeKeys = new Set<string>();

  if (!replaceAll) {
    const { data: existing, error: selErr } = await supa
      .from("products")
      .select("product_name,price");
    if (selErr) throw selErr;
    for (const r of existing ?? []) {
      dedupeKeys.add(
        normDedupeKey(String((r as { product_name?: string }).product_name ?? ""), String((r as { price?: string | null }).price ?? ""))
      );
    }
  }

  // ─── products.csv (structured, explicit ids) ─────────────────────────────
  const productsPath = join(cwd, "products.csv");
  if (!withProductsCsv) {
    console.warn(
      "[import-full-catalog] Skipping products.csv (use --replace-all or --with-products-csv)."
    );
  } else if (!existsSync(productsPath)) {
    console.warn(`[import-full-catalog] Missing ${productsPath} — skipping structured import.`);
  } else {
    const table = parseCsvQuoted(readFileSync(productsPath, "utf8"));
    const rows = rowsToObjects(table);

    for (const r of rows) {
      const externalId = String(r["id"] ?? "").trim();
      const name = String(r["product name"] ?? "").trim();
      const rawCategory = String(r["category"] ?? "").trim();
      const rawWeight = String(r["weight g"] ?? r["weight"] ?? "").trim();
      const rawPrice = String(r["price iqd"] ?? r["price"] ?? "").trim();
      const imageValue = String(r["image"] ?? r["image filename"] ?? "").trim();

      const priceNum = parseIqdPrice(rawPrice);
      if (!externalId || !name || priceNum <= 0) {
        stats.productsCsv.skippedInvalid++;
        continue;
      }

      const idNum = parseInt(externalId, 10);
      if (!Number.isFinite(idNum) || String(idNum) !== externalId) {
        stats.productsCsv.skippedInvalid++;
        continue;
      }

      const abs = resolveImageFile(imagesDir, {
        imageValue,
        externalId,
        productName: name,
      });
      let imageUrl: string | null = null;
      if (abs) {
        if (!dryRun) {
          imageUrl = await resolveImageUrl({
            mode: imageMode,
            absImagePath: abs,
            stemKey: imageStemKey(externalId, name),
          });
        }
      } else if (imageValue) {
        stats.productsCsv.missingImages++;
      }

      const row = {
        id: idNum,
        product_name: name,
        category: rawCategory || null,
        weight: rawWeight || null,
        price: rawPrice || String(priceNum),
        image: imageUrl || null,
      };

      if (!dryRun) {
        const { error } = await supa.from("products").upsert(row, { onConflict: "id" });
        if (error) throw error;
      }
      dedupeKeys.add(normDedupeKey(name, row.price));
      stats.productsCsv.upserted += 1;
    }
  }

  // ─── Boozt new *.csv (4 columns, auto id) ─────────────────────────────────
  const booztFiles = listBooztCsvFiles(cwd);
  stats.boozt.files = booztFiles.length;

  let booztLine = 0;
  let nextBooztId = 1;
  if (!dryRun && booztFiles.length > 0) {
    const { data: mxRows, error: mxErr } = await supa
      .from("products")
      .select("id")
      .order("id", { ascending: false })
      .limit(1);
    if (mxErr) throw mxErr;
    const maxId = mxRows?.[0]?.id;
    nextBooztId =
      typeof maxId === "number" && Number.isFinite(maxId) ? maxId + 1 : 1;
  }

  for (const filePath of booztFiles) {
    const raw = readFileSync(filePath, "utf8");
    const bRows = parseBoozt4Col(raw);
    const baseName = filePath.split(/[/\\]/).pop() ?? "boozt";

    for (const br of bRows) {
      booztLine++;
      const retail = parseIqdPrice(br.retail);
      const wholesale = parseIqdPrice(br.wholesale);
      const priceNum = retail > 0 ? retail : wholesale;
      if (!br.group || priceNum <= 0) {
        stats.boozt.skippedInvalid++;
        continue;
      }

      const productName = [br.group, br.item].filter(Boolean).join(" - ").trim();
      const priceStr = String(priceNum);
      const dk = normDedupeKey(productName, priceStr);
      if (dedupeKeys.has(dk)) {
        stats.boozt.skippedDup++;
        continue;
      }

      const absImg = resolveDefaultBooztImagePath(imagesDir, br.group, br.item);
      let imageUrl: string | null = null;
      if (absImg) {
        if (!dryRun) {
          const stem = `${baseName}-${booztLine}-${priceStr}`.replace(/[^a-zA-Z0-9_-]+/g, "-");
          imageUrl = await resolveImageUrl({
            mode: imageMode,
            absImagePath: absImg,
            stemKey: stem.slice(0, 80),
          });
        }
      } else {
        stats.boozt.missingImages++;
      }

      const insertRow = {
        id: nextBooztId,
        product_name: productName,
        category: br.group || null,
        weight: null,
        price: priceStr,
        image: imageUrl || null,
      };

      if (!dryRun) {
        const { error } = await supa.from("products").insert(insertRow);
        if (error) throw error;
        nextBooztId += 1;
      }
      dedupeKeys.add(dk);
      stats.boozt.inserted++;
    }
  }

  let totalProductsInDb: number | null = null;
  if (!dryRun) {
    const { count } = await supa
      .from("products")
      .select("*", { count: "exact", head: true });
    totalProductsInDb = count ?? null;
  }

  console.log(
    JSON.stringify(
      {
        ...stats,
        imagesDir,
        publicImages: usePublicImages,
        booztFiles: booztFiles.map((p) => p.split(/[/\\]/).pop()),
        totalProductsInDb,
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
