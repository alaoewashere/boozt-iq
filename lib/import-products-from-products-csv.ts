/**
 * Import products.csv into Supabase `public.products`.
 * Images: --public-images copies files into public/catalog-import/ and sets `image` URL.
 *
 *   npx tsx --env-file=.env.local lib/import-products-from-products-csv.ts products.csv --upsert --images-dir=images --public-images
 */
import "./load-env";
import { readFileSync, existsSync, mkdirSync, copyFileSync } from "fs";
import { join, resolve, extname } from "path";
import { createClient } from "@supabase/supabase-js";
import { uploadImage } from "./cloudinary";

type CsvRow = Record<string, string>;

function normalizeHeader(h: string): string {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9 ]+/g, "");
}

function parseCsv(raw: string): string[][] {
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

const PUBLIC_CATALOG_REL = "/catalog-import";

function publishImageUnderPublic(absSourcePath: string, stemKey: string): string {
  const dir = join(process.cwd(), "public", "catalog-import");
  mkdirSync(dir, { recursive: true });
  const extRaw = extname(absSourcePath).toLowerCase();
  const ext = extRaw && extRaw.length <= 6 ? extRaw : ".jpeg";
  const safeStem = stemKey.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 48) || "img";
  const fileName = `molasses-group-${safeStem}${ext}`;
  const destAbs = join(dir, fileName);
  copyFileSync(absSourcePath, destAbs);
  return `${PUBLIC_CATALOG_REL}/${fileName}`;
}

async function resolveImageUrl(opts: {
  mode: "cloudinary" | "public";
  productId: string;
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

async function main() {
  const csvPath = process.argv[2] || "products.csv";
  const dryRun = process.argv.includes("--dry-run");
  const upsert = process.argv.includes("--upsert");
  const usePublicImages = process.argv.includes("--public-images");
  const imageMode = usePublicImages ? ("public" as const) : ("cloudinary" as const);

  const imagesDirFlag = process.argv.find((a) => a.startsWith("--images-dir="));
  const imagesDir = imagesDirFlag
    ? imagesDirFlag.split("=").slice(1).join("=").trim()
    : join(process.cwd(), "images");

  const supa = getSupabaseForScript();
  const raw = readFileSync(csvPath, "utf8");
  const table = parseCsv(raw);
  const rows = rowsToObjects(table);
  if (rows.length === 0) throw new Error(`No data rows found in: ${csvPath}`);

  const { data: existingRows } = await supa.from("products").select("id");
  const existingIds = new Set((existingRows ?? []).map((r: { id: number }) => String(r.id)));

  let created = 0;
  let updated = 0;
  let skippedDup = 0;
  let skippedInvalid = 0;
  let missingImages = 0;

  for (const r of rows) {
    const externalId = String(r["id"] ?? "").trim();
    const name = String(r["product name"] ?? "").trim();
    const rawCategory = String(r["category"] ?? "").trim();
    const rawWeight = String(r["weight g"] ?? r["weight"] ?? "").trim();
    const rawPrice = String(r["price iqd"] ?? r["price"] ?? "").trim();
    const imageValue = String(r["image"] ?? r["image filename"] ?? "").trim();

    const priceNum = parseIqdPrice(rawPrice);
    if (!externalId || !name || priceNum <= 0) {
      skippedInvalid++;
      continue;
    }

    const idNum = parseInt(externalId, 10);
    if (!Number.isFinite(idNum) || String(idNum) !== externalId) {
      skippedInvalid++;
      continue;
    }

    const exists = existingIds.has(externalId);
    if (exists && !upsert) {
      skippedDup++;
      continue;
    }

    const abs = resolveImageFile(imagesDir, {
      imageValue,
      externalId,
      productName: name,
    });
    let imageUrl = "";
    if (abs) {
      if (!dryRun) {
        imageUrl = await resolveImageUrl({
          mode: imageMode,
          productId: externalId,
          absImagePath: abs,
          stemKey: imageStemKey(externalId, name),
        });
      }
    } else if (imageValue) {
      missingImages++;
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

    if (exists) updated++;
    else {
      created++;
      existingIds.add(externalId);
    }
  }

  console.log(
    JSON.stringify(
      {
        file: csvPath,
        imagesDir,
        created,
        updated,
        skippedDup,
        skippedInvalid,
        missingImages,
        mode: dryRun ? "dry-run" : "write",
        upsert,
        imageMode,
        usePublicImages,
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
