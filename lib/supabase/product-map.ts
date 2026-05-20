import type { ProductDoc } from "@/lib/types";
import { CATEGORY_IDS, SUBCATEGORY_DEFAULTS, SUBCATEGORY_IDS } from "./catalog-ids";

export type SupabaseProductRow = {
  id: number;
  product_name: string;
  category: string | null;
  weight: string | null;
  price: string | null;
  image: string | null;
};

function parsePriceIqd(text: string | null): number {
  const digits = String(text ?? "").replace(/[^\d]/g, "");
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Oxbar Svopp line (DB often spells category "Oxbar Svoop"). */
function isOxbarSvoppLine(categoryText: string, productName: string): boolean {
  const t = `${String(categoryText ?? "").trim()} ${String(productName ?? "").trim()}`.toLowerCase();
  if (!t.includes("oxbar")) return false;
  return (
    t.includes("svopp") ||
    t.includes("svoop") ||
    /\boxbar\s+svoop\b/i.test(t) ||
    /\boxbar\s+svopp\b/i.test(t)
  );
}

function parseProductName(productName: string): string {
  const raw = String(productName ?? "").trim();
  if (raw.startsWith("{")) {
    try {
      const o = JSON.parse(raw) as { en?: string; ar?: string };
      const en = String(o.en ?? "").trim();
      const ar = String(o.ar ?? "").trim();
      if (en) return en;
      if (ar) return ar;
    } catch {
      /* fall through */
    }
  }
  return raw;
}

/** Map CSV / free-text category (and optional product name) to storefront slugs. */
export function inferCategorySlugs(
  categoryText: string | null,
  productName?: string | null
): {
  categorySlug: string;
  subcategorySlug: string;
} {
  const cat = String(categoryText ?? "").trim();
  const name = String(productName ?? "").trim();
  const t = `${cat} ${name}`.toLowerCase();
  const slash = cat
    .trim()
    .match(/^([a-z0-9-]+)\s*\/\s*([a-z0-9-]+)$/i);
  if (slash) {
    const cat = slash[1].toLowerCase();
    const sub = slash[2].toLowerCase();
    if (cat in CATEGORY_IDS && sub in SUBCATEGORY_IDS) {
      return { categorySlug: cat, subcategorySlug: sub };
    }
  }

  const nameLower = name.toLowerCase();
  /** Trust product name when DB category is wrong (e.g. Vozol Vista stored as "Oxbar Pod"). */
  if (nameLower.includes("vozol") && !nameLower.includes("oxbar")) {
    if (
      nameLower.includes("gear ice") ||
      t.includes("ice & sweet") ||
      t.includes("ice and sweet")
    ) {
      return { categorySlug: "pods", subcategorySlug: "vozol-gear-ice-sweet" };
    }
    if (nameLower.includes("gear") || t.includes("فوزول جير")) {
      return { categorySlug: "pods", subcategorySlug: "vozol-gear" };
    }
    if (nameLower.includes("star") || (nameLower.includes("vozol") && t.includes("40000"))) {
      return { categorySlug: "pods", subcategorySlug: "vozol-star-40000" };
    }
    return { categorySlug: "pods", subcategorySlug: "vozol" };
  }

  if (
    /^hookah\s+molasses\s+packets$/i.test(cat) ||
    /^hookah\s*\/\s*hookah-molasses-packets$/i.test(cat)
  ) {
    return {
      categorySlug: "hookah",
      subcategorySlug: "hookah-molasses-packets",
    };
  }
  /** DB category "Hookah" / "Hookahs" (full devices) — 🪔 Hookah → Hookahs subcategory. */
  if (
    /^hookahs?$/i.test(cat) ||
    /^hookah\s*\/\s*hookahs$/i.test(cat)
  ) {
    return { categorySlug: "hookah", subcategorySlug: "hookahs" };
  }
  if (t.includes("oxbar") && t.includes("g turbo")) {
    return { categorySlug: "pods", subcategorySlug: "oxbar-g-turbo" };
  }
  if (t.includes("tri-fusion") || t.includes("tri fusion")) {
    return { categorySlug: "pods", subcategorySlug: "oxbar-tri-fusion" };
  }
  if ((t.includes("maze 2") || t.includes("maze2")) && t.includes("oxbar")) {
    return { categorySlug: "pods", subcategorySlug: "oxbar-maze-2-pro" };
  }
  if (t.includes("panther") && (t.includes("oxbar") || t.includes("pod") || t.includes("بود"))) {
    return { categorySlug: "pods", subcategorySlug: "oxbar-panther-x" };
  }
  if (t.includes("al-sheikh") || t.includes("al sheikh") || t.includes("الشيخ")) {
    return { categorySlug: "pods", subcategorySlug: "oxbar-al-sheikh" };
  }
  if (isOxbarSvoppLine(cat, name)) {
    return { categorySlug: "pods", subcategorySlug: "oxbar-svopp" };
  }
  if (t.includes("mosmo") && t.includes("storm")) {
    return { categorySlug: "pods", subcategorySlug: "mosmo-storm-x" };
  }
  if (t.includes("mosmo") && t.includes("sultan")) {
    return { categorySlug: "pods", subcategorySlug: "mosmo-sultan" };
  }
  if (t.includes("mosmo") && (t.includes(" gt") || t.endsWith("gt") || t.includes("mosmo gt"))) {
    return { categorySlug: "pods", subcategorySlug: "mosmo-gt" };
  }
  if (
    /^vozol$/i.test(cat) ||
    /^vozo[l;]?$/i.test(cat) ||
    (t.includes("vozol") && t.includes("vista"))
  ) {
    return { categorySlug: "pods", subcategorySlug: "vozol" };
  }
  if (
    (t.includes("vozol") && t.includes("gear ice")) ||
    (t.includes("gear ice") && t.includes("sweet")) ||
    t.includes("ice & sweet") ||
    t.includes("ice and sweet")
  ) {
    return { categorySlug: "pods", subcategorySlug: "vozol-gear-ice-sweet" };
  }
  if (
    (t.includes("vozol") && t.includes("gear")) ||
    t === "vozol gear" ||
    t.includes("فوزول جير")
  ) {
    return { categorySlug: "pods", subcategorySlug: "vozol-gear" };
  }
  if (
    t.includes("vozol star") ||
    (t.includes("vozol") && t.includes("star") && t.includes("40000"))
  ) {
    return { categorySlug: "pods", subcategorySlug: "vozol-star-40000" };
  }
  if (
    (t.includes("pod") || t.includes("بود")) &&
    (t.includes("oxbar") || t.includes("oxbar pod")) &&
    !isOxbarSvoppLine(cat, name)
  ) {
    return { categorySlug: "pods", subcategorySlug: "oxbar-pod" };
  }
  if (t.includes("caliburn") || t.includes("كاليبورن")) {
    return { categorySlug: "pods", subcategorySlug: "caliburn" };
  }
  if (t.includes("charlie") || t.includes("تشارلي")) {
    return { categorySlug: "pods", subcategorySlug: "charlie" };
  }
  if (t.includes("lost mary") || t.includes("lostmary")) {
    return { categorySlug: "pods", subcategorySlug: "lost-mary" };
  }
  if (t.includes("hucca") || t.includes("huuca") || t.includes("هوكا")) {
    return { categorySlug: "pods", subcategorySlug: "hucca" };
  }
  if (t.includes("cool star") || t.includes("coolstar")) {
    return { categorySlug: "pods", subcategorySlug: "cool-star" };
  }
  if (t.includes("tesla bar") || t.includes("teslabar")) {
    return { categorySlug: "pods", subcategorySlug: "tesla-bar" };
  }
  if (t.includes("iget") || t.includes("i get")) {
    return { categorySlug: "pods", subcategorySlug: "iget" };
  }
  if (t.includes("al fakher") || t.includes("alfakher") || t.includes("الفاخر")) {
    return { categorySlug: "pods", subcategorySlug: "al-fakher" };
  }
  if (
    t === "hookah-pod" ||
    /^hookah\s*\/\s*hookah-pod$/i.test(cat) ||
    (t.includes("hookah") &&
      (t.includes("pod") || t.includes("بود") || t.includes("puff") || t.includes("disposable")) &&
      !/^hookah$/i.test(cat) &&
      !t.includes("parts") &&
      !t.includes("molasses") &&
      !t.includes("معسل"))
  ) {
    return { categorySlug: "pods", subcategorySlug: "hookah-pod" };
  }
  if (t.includes("kori") || t.includes("كوري")) {
    return { categorySlug: "pods", subcategorySlug: "kori" };
  }
  if (t.includes("geek bar") || t.includes("geekbar")) {
    return { categorySlug: "pods", subcategorySlug: "geek-bar" };
  }
  if (t.includes("oukitel") || t.includes("أوكيتيل")) {
    return { categorySlug: "pods", subcategorySlug: "oukitel" };
  }
  if (t.includes("aaok") || t.includes("abac")) {
    return { categorySlug: "pods", subcategorySlug: "aaok-abac" };
  }
  if (t.includes("black bar") || t.includes("blackbar")) {
    return { categorySlug: "pods", subcategorySlug: "black-bar" };
  }
  if (t.includes("breeze smoke") || (t.includes("breeze") && t.includes("smoke"))) {
    return { categorySlug: "pods", subcategorySlug: "breeze-smoke" };
  }
  if (
    t === "joy" ||
    t.startsWith("joy /") ||
    (/\bjoy\b/.test(t) &&
      (t.includes("pod") || t.includes("بود") || t.includes("puff") || t.includes("bar")))
  ) {
    return { categorySlug: "pods", subcategorySlug: "joy" };
  }
  if (t.includes("vozol")) {
    return { categorySlug: "pods", subcategorySlug: "vozol" };
  }
  if (t.includes("nexlim") || t.includes("نيكسليم")) {
    return { categorySlug: "vape", subcategorySlug: "nexlim" };
  }
  if (t.includes("xlime")) {
    return { categorySlug: "vape", subcategorySlug: "xlime-vapes" };
  }
  if (t.includes("cartridge") || t.includes("catridge") || t.includes("كارتريدج")) {
    return { categorySlug: "vape", subcategorySlug: "cartridge" };
  }
  if (
    t.includes("e-liquid") ||
    t.includes("eliquid") ||
    (t.includes("juice") && !t.includes("board")) ||
    t.includes("عصير")
  ) {
    return { categorySlug: "vape", subcategorySlug: "juices" };
  }
  if (t.includes("coil") || t.includes("tank") || t.includes("battery") || t.includes("charger")) {
    return { categorySlug: "vape", subcategorySlug: "cartridge" };
  }
  if (t.includes("mod") || t.includes("device")) {
    return { categorySlug: "vape", subcategorySlug: "nexlim" };
  }
  if (
    t.includes("oxbar") &&
    !t.includes("g turbo") &&
    !(t.includes("pod") || t.includes("بود")) &&
    !isOxbarSvoppLine(cat, name)
  ) {
    return { categorySlug: "pods", subcategorySlug: "oxbar" };
  }
  if (t.includes("vape") || t.includes("فيب")) {
    return { categorySlug: "vape", subcategorySlug: "juices" };
  }
  if (t.includes("pod") || t.includes("بود")) {
    return { categorySlug: "pods", subcategorySlug: "vozol" };
  }
  if (t.includes("iqos") || t.includes("آيكوس")) {
    return { categorySlug: "nicotine", subcategorySlug: "iqos" };
  }
  if (t.includes("velo") || t.includes("فيلو")) {
    return { categorySlug: "nicotine", subcategorySlug: "velo" };
  }
  if (t.includes("nicotine") || t.includes("نيكوتين")) {
    return { categorySlug: "nicotine", subcategorySlug: "velo" };
  }
  if (t.includes("domino") || t.includes("دومينو")) {
    return { categorySlug: "boardgames", subcategorySlug: "dominos" };
  }
  if (t.includes("backgammon") || t.includes("طاولة زهر") || t.includes("tawla")) {
    return { categorySlug: "boardgames", subcategorySlug: "backgammon" };
  }
  if (
    t.includes("playing card") ||
    (t.includes("card") && (t.includes("game") || t.includes("board"))) ||
    t === "cards"
  ) {
    return { categorySlug: "boardgames", subcategorySlug: "cards" };
  }
  if (t.includes("puzzle") || t.includes("بازل")) {
    return { categorySlug: "boardgames", subcategorySlug: "cards" };
  }
  if (t.includes("party") || t.includes("strategy")) {
    return { categorySlug: "boardgames", subcategorySlug: "cards" };
  }
  if (t.includes("cigarette") || t.includes("سجائر") || t.includes("تبغ")) {
    return { categorySlug: "cigarettes", subcategorySlug: "general" };
  }
  if (t.includes("board") || t.includes("لوح") || t.includes("لعبة")) {
    return { categorySlug: "boardgames", subcategorySlug: "cards" };
  }
  if (
    /\bparts\b/i.test(cat) &&
    (t.includes("hookah") || t.includes("hokkah") || t.includes("شيشة")) &&
    !t.includes("huuca") &&
    !t.includes("hucca")
  ) {
    return { categorySlug: "hookah", subcategorySlug: "parts" };
  }
  if (
    /hookah\s+molasses\s+packets/i.test(cat) ||
    (/\bpacket/i.test(cat) && /\bmolasses\b/i.test(cat) && !t.includes("pod"))
  ) {
    return {
      categorySlug: "hookah",
      subcategorySlug: "hookah-molasses-packets",
    };
  }
  if (t.includes("molasses") || t.includes("معسل") || t.includes("hokkah") || t.includes("hookah")) {
    return { categorySlug: "hookah", subcategorySlug: "molasses" };
  }
  return { categorySlug: "hookah", subcategorySlug: "molasses" };
}

function slugToIds(categorySlug: string, subSlug: string) {
  const catKey = categorySlug as keyof typeof CATEGORY_IDS;
  const subKey = subSlug as keyof typeof SUBCATEGORY_IDS;
  const categoryId = CATEGORY_IDS[catKey] ?? CATEGORY_IDS.hookah;
  const defaultSub = SUBCATEGORY_DEFAULTS[catKey] ?? SUBCATEGORY_DEFAULTS.hookah;
  const subcategoryId = SUBCATEGORY_IDS[subKey] ?? SUBCATEGORY_IDS[defaultSub];
  return { categoryId, subcategoryId };
}

export function rowToProductDoc(row: SupabaseProductRow): ProductDoc {
  const name_en = parseProductName(row.product_name);
  const { categorySlug, subcategorySlug } = inferCategorySlugs(
    row.category,
    name_en
  );
  const { categoryId, subcategoryId } = slugToIds(categorySlug, subcategorySlug);
  const price = parsePriceIqd(row.price);
  const weight = String(row.weight ?? "").trim();
  const now = Date.now();
  return {
    id: String(row.id),
    name_en,
    description_en: weight ? `Weight: ${weight}` : "",
    description_ar: weight ? `الوزن: ${weight}` : "",
    price,
    discount: 0,
    stock: 99,
    categoryId,
    categorySlug,
    subcategoryId,
    imageUrl: String(row.image ?? "").trim(),
    imagePath: "",
    isAvailable: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function adminFormToProductRow(fields: {
  name_en: string;
  description_en: string;
  description_ar: string;
  price: number;
  categorySlug: string;
  subcategorySlug: string;
}): Omit<SupabaseProductRow, "id"> {
  const product_name = fields.name_en.trim();
  const category = `${fields.categorySlug} / ${fields.subcategorySlug}`;
  const weight = [fields.description_en, fields.description_ar]
    .filter(Boolean)
    .join(" | ")
    .slice(0, 500);
  const price = String(Math.round(fields.price));
  return {
    product_name,
    category,
    weight: weight || null,
    price,
    image: "",
  };
}
