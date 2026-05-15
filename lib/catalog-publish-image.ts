import { mkdirSync, copyFileSync } from "fs";
import { join, extname, resolve } from "path";
import { existsSync } from "fs";
import { inferCategorySlugs } from "./supabase/product-map";

export const PUBLIC_CATALOG_REL = "/catalog-import";

export function publishImageUnderPublic(
  absSourcePath: string,
  stemKey: string
): string {
  const dir = join(process.cwd(), "public", "catalog-import");
  mkdirSync(dir, { recursive: true });
  const extRaw = extname(absSourcePath).toLowerCase();
  const ext = extRaw && extRaw.length <= 6 ? extRaw : ".jpeg";
  const safeStem = stemKey.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 48) || "img";
  const fileName = `catalog-${safeStem}${ext}`;
  const destAbs = join(dir, fileName);
  copyFileSync(absSourcePath, destAbs);
  return `${PUBLIC_CATALOG_REL}/${fileName}`;
}

/** Pick `images/1.jpeg` (hookah) vs `images/2.jpeg` (vape/pods/board) from row text. */
export function resolveDefaultBooztImagePath(
  imagesDir: string,
  group: string,
  item: string
): string | null {
  const hint = `${group} ${item}`;
  const { categorySlug } = inferCategorySlugs(hint);
  const stem = categorySlug === "hookah" ? "1" : "2";
  for (const ext of [".jpeg", ".jpg", ".png", ".webp"]) {
    const p = resolve(imagesDir, stem + ext);
    if (existsSync(p)) return p;
  }
  return null;
}
