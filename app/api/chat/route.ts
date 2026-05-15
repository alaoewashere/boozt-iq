import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Groq from "groq-sdk";
import {
  getCategoriesWithSubcategories,
  getProductsScan,
} from "@/lib/server-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1),
  conversationHistory: z.array(messageSchema).optional(),
});

type ProductRow = {
  id: string;
  name_en: string;
  name_ar: string;
  price: number;
  category?: string;
  stock?: number | boolean;
};

function pickFirstString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function coerceLocalizedName(v: unknown): { en?: string; ar?: string } | null {
  // Supports shapes like: { en: "...", ar: "..." } or { name_en: "...", name_ar: "..." }
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const en = pickFirstString(o, ["en", "name_en", "nameEn", "english", "title_en", "titleEn"]);
  const ar = pickFirstString(o, ["ar", "name_ar", "nameAr", "arabic", "title_ar", "titleAr"]);
  if (!en && !ar) return null;
  return { en, ar };
}

function extractProductNames(x: Record<string, unknown>): { name_en: string; name_ar: string } {
  // Try common direct fields first
  const nameEn = pickFirstString(x, ["name_en", "nameEn", "englishName", "title_en", "titleEn"]);
  const nameAr = pickFirstString(x, ["name_ar", "nameAr", "arabicName", "title_ar", "titleAr"]);

  // Generic name/title fields (single string)
  const nameGeneric = pickFirstString(x, ["name", "title", "productName", "label"]);

  // Localized object fields
  const localized =
    coerceLocalizedName(x.name) ??
    coerceLocalizedName(x.title) ??
    coerceLocalizedName(x.names) ??
    coerceLocalizedName(x.translations) ??
    coerceLocalizedName(x.i18n);

  const en = nameEn ?? localized?.en ?? (nameGeneric && !hasArabicScript(nameGeneric) ? nameGeneric : "") ?? "";
  const ar = nameAr ?? localized?.ar ?? (nameGeneric && hasArabicScript(nameGeneric) ? nameGeneric : "") ?? "";

  return { name_en: en, name_ar: ar };
}

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, "") // Arabic diacritics
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasArabicScript(s: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
    s
  );
}

function detectLang(text: string): "ar" | "en" {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
    text
  )
    ? "ar"
    : "en";
}

function fmtStock(stock: ProductRow["stock"]): string {
  if (typeof stock === "number") {
    if (stock <= 0) return "out_of_stock";
    return `in_stock:${stock}`;
  }
  if (typeof stock === "boolean") return stock ? "in_stock" : "out_of_stock";
  return "unknown";
}

function formatProductShort(p: ProductRow, lang: "ar" | "en"): string {
  const rawName =
    lang === "ar"
      ? p.name_ar?.trim() || p.name_en?.trim() || "—"
      : p.name_en?.trim() || p.name_ar?.trim() || "—";
  const name = rawName.slice(0, 80);
  const price = Number.isFinite(p.price) ? Math.round(p.price) : 0;
  const stock = fmtStock(p.stock).startsWith("in_stock") ? "in stock" : "out";
  return `- ${name} | ${price.toLocaleString("en-US")} IQD | ${stock}`;
}

function pickRandom<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return [...arr];
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function isGeneralQuestion(q: string): boolean {
  const s = normalize(q);
  // If user asks delivery / support / greeting, don't need a tight catalog.
  return (
    s.length < 6 ||
    /^(hi|hello|hey|السلام|مرحبا|هلا)\b/.test(s) ||
    s.includes("deliver") ||
    s.includes("delivery") ||
    s.includes("شحن") ||
    s.includes("توصيل") ||
    s.includes("واتساب") ||
    s.includes("whatsapp")
  );
}

function wantsCheap(q: string): boolean {
  const s = normalize(q);
  return (
    s.includes("cheap") ||
    s.includes("cheapest") ||
    s.includes("lowest price") ||
    s.includes("budget") ||
    s.includes("ارخص") ||
    s.includes("رخيص")
  );
}

function inferCategoryHint(
  q: string
): "vape" | "hookah" | "pods" | "nicotine" | "cigarettes" | "boardgames" | "accessories" | null {
  const s = normalize(q);
  if (s.includes("vape") || s.includes("فيب") || s.includes("vaping")) return "vape";
  if (s.includes("hookah") || s.includes("shisha") || s.includes("شيشة") || s.includes("أركيلة")) return "hookah";
  if (s.includes("pod") || s.includes("pods") || s.includes("بود") || s.includes("سحبة")) return "pods";
  if (s.includes("velo") || s.includes("iqos") || s.includes("nicotine") || s.includes("نيكوتين") || s.includes("آيكوس"))
    return "nicotine";
  if (s.includes("cigarette") || s.includes("سجائر") || s.includes("تبغ")) return "cigarettes";
  if (s.includes("board game") || s.includes("domino") || s.includes("backgammon") || s.includes("ألعاب لوح"))
    return "boardgames";
  if (s.includes("coil") || s.includes("كويل") || s.includes("battery") || s.includes("بطارية") || s.includes("accessor"))
    return "accessories";
  return null;
}

function scoreProductMatch(q: string, p: ProductRow): number {
  const query = normalize(q);
  if (!query) return 0;

  const hay = normalize(`${p.name_en ?? ""} ${p.name_ar ?? ""}`);
  if (!hay) return 0;

  // Token scoring: exact substring hits are stronger than per-token hits.
  let score = 0;
  if (hay.includes(query)) score += 20;

  const tokens = query.split(" ").filter((t) => t.length >= 2).slice(0, 8);
  for (const t of tokens) {
    if (hay.includes(t)) score += 4;
  }
  return score;
}

function selectRelevantProducts(args: {
  allProducts: ProductRow[];
  lastUserMessage: string;
}): ProductRow[] {
  const { allProducts, lastUserMessage } = args;
  if (allProducts.length === 0) return [];

  const q = lastUserMessage ?? "";

  // Cheap → send lowest price (max 20)
  if (wantsCheap(q)) {
    return [...allProducts]
      .filter((p) => Number.isFinite(p.price) && p.price > 0)
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
      .slice(0, 20);
  }

  // Category hint → prioritize matching category field + name matches
  const hint = inferCategoryHint(q);
  if (hint) {
    const filtered = allProducts.filter((p) => {
      const cat = normalize(p.category ?? "");
      if (!cat) return false;
      if (hint === "vape") return cat.includes("vape") || cat.includes("فيب");
      if (hint === "hookah") return cat.includes("hookah") || cat.includes("shisha") || cat.includes("شيشة");
      if (hint === "pods") return cat.includes("pod") || cat.includes("pods") || cat.includes("بود");
      if (hint === "nicotine")
        return cat.includes("nicotine") || cat.includes("velo") || cat.includes("iqos") || cat.includes("نيكوتين");
      if (hint === "cigarettes") return cat.includes("cigarette") || cat.includes("سجائر");
      if (hint === "boardgames")
        return cat.includes("board") || cat.includes("domino") || cat.includes("backgammon") || cat.includes("لوح");
      if (hint === "accessories") return cat.includes("access") || cat.includes("coil") || cat.includes("كويل");
      return false;
    });
    const scored = (filtered.length ? filtered : allProducts)
      .map((p) => ({ p, s: scoreProductMatch(q, p) }))
      .sort((a, b) => b.s - a.s || (a.p.price ?? 0) - (b.p.price ?? 0))
      .slice(0, 20)
      .map((x) => x.p);
    return scored;
  }

  // Keyword match on name_en/name_ar → top 20
  const scored = allProducts
    .map((p) => ({ p, s: scoreProductMatch(q, p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || (a.p.price ?? 0) - (b.p.price ?? 0))
    .slice(0, 20)
    .map((x) => x.p);
  if (scored.length) return scored;

  // General question → show a small balanced sample across categories (5 each until 20)
  if (isGeneralQuestion(q)) {
    const byCat = new Map<string, ProductRow[]>();
    for (const p of allProducts) {
      const key = (p.category?.trim() || "Other").slice(0, 40);
      const arr = byCat.get(key) ?? [];
      arr.push(p);
      byCat.set(key, arr);
    }
    const cats = [...byCat.entries()].sort((a, b) => b[1].length - a[1].length);
    const out: ProductRow[] = [];
    for (const [, items] of cats) {
      out.push(...pickRandom(items, 5));
      if (out.length >= 20) break;
    }
    return out.slice(0, 20);
  }

  // No match → 10 random examples
  return pickRandom(allProducts, 10);
}

async function fetchAllProducts(): Promise<ProductRow[]> {
  const docs = await getProductsScan();
  return docs.map((d) => {
    const x = d as unknown as Record<string, unknown>;
    const names = extractProductNames(x);
    return {
      id: d.id,
      name_en: names.name_en,
      name_ar: names.name_ar,
      price: Number(x.price ?? 0),
      category:
        x.category != null
          ? String(x.category)
          : x.categoryId != null
            ? String(x.categoryId)
            : undefined,
      stock:
        typeof x.stock === "number" || typeof x.stock === "boolean"
          ? (x.stock as number | boolean)
          : typeof x.inStock === "boolean"
            ? (x.inStock as boolean)
            : undefined,
    };
  });
}

async function fetchAllCategories(): Promise<string[]> {
  const tree = await getCategoriesWithSubcategories();
  return tree.map(({ category }) =>
    String(category.name_en ?? category.id)
  );
}

function buildDynamicCatalogBlock(products: ProductRow[], lang: "ar" | "en"): string {
  const lines = products.map((p) => formatProductShort(p, lang)).join("\n");
  return lines.length ? lines : "- (No products found)";
}

function buildSystemPrompt(args: {
  lang: "ar" | "en";
  categories: string[];
  products: ProductRow[];
}): string {
  const { lang, categories, products } = args;
  const catalog = buildDynamicCatalogBlock(products, lang);
  const categoryList = categories.length ? categories.slice(0, 20).join(", ") : "—";

  const deliveryLine =
    lang === "ar"
      ? "التوصيل: نوصل لجميع أنحاء العراق، تواصل معنا على واتساب."
      : "Delivery: We deliver across Iraq, contact us on WhatsApp.";

  return [
    "You are Boozt.iq customer support. Be friendly and use emojis. Keep replies short.",
    "",
    "CRITICAL LANGUAGE RULE:",
    "- Detect the language from the customer's LAST message only.",
    "- If the customer writes in Arabic → your ENTIRE reply must be in Arabic only. Zero English words allowed.",
    "- If the customer writes in English → your ENTIRE reply must be in English only. Zero Arabic words allowed.",
    "- NEVER mix both languages in the same reply.",
    "- NEVER write Arabic and English in the same sentence.",
    lang === "ar"
      ? "Customer is Arabic → Reply FULLY in Arabic only."
      : "Customer is English → Reply FULLY in English only.",
    "",
    deliveryLine,
    "Do NOT invent products/prices. Use only the product list provided.",
    "",
    `Categories: ${categoryList}`,
    "",
    "Relevant products (use these only):",
    catalog,
  ].join("\n");
}

function enforceSingleLanguage(reply: string, lang: "ar" | "en"): string {
  const s = (reply ?? "").trim();
  if (!s) return s;

  // If Arabic required, strip Latin letters (keep digits/punctuation).
  if (lang === "ar") {
    const cleaned = s.replace(/[A-Za-z]+/g, "").replace(/\s+/g, " ").trim();
    return cleaned;
  }

  // If English required, strip Arabic script blocks.
  const cleaned = s
    .replace(
      /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

export async function POST(req: NextRequest) {
  try {
    console.log("[api/chat] API called");
    console.log("[api/chat] Groq key exists:", !!process.env.GROQ_API_KEY);

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      console.log("[api/chat] Invalid request body", parsed.error.flatten());
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const incoming = parsed.data.messages;
    const history = parsed.data.conversationHistory ?? incoming;
    const lastUser = [...history].reverse().find((m) => m.role === "user");
    const lastUserText = lastUser?.content ?? "";
    const lang = detectLang(lastUserText);
    console.log("[api/chat] Detected lang:", lang);

    const [products, categories] = await Promise.all([
      fetchAllProducts(),
      fetchAllCategories(),
    ]);
    console.log("[api/chat] Products fetched:", products.length);
    console.log("[api/chat] Categories fetched:", categories.length);
    console.log("[api/chat] Sample products:", products.slice(0, 3));

    const relevantProducts = selectRelevantProducts({
      allProducts: products,
      lastUserMessage: lastUserText,
    });
    console.log("[api/chat] Relevant products:", relevantProducts.length);

    const systemPrompt = buildSystemPrompt({
      lang,
      categories,
      products: relevantProducts,
    });
    console.log("[api/chat] System prompt chars:", systemPrompt.length);

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server is missing GROQ_API_KEY" },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    const cleanedHistory = history
      .filter((m) => m.content && typeof m.content === "string")
      .slice(-20);

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.5,
      max_tokens: 500,
      messages: [
        { role: "system", content: systemPrompt },
        ...cleanedHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
    });
    console.log("[api/chat] Groq response:", completion);

    const rawReply = completion.choices?.[0]?.message?.content?.trim() || "";
    const enforced = enforceSingleLanguage(rawReply, lang);
    const reply =
      enforced ||
      (lang === "ar"
        ? "عذرًا، حدث خطأ. تواصل معنا على واتساب."
        : "Sorry — something went wrong. Please contact us on WhatsApp.");

    return NextResponse.json({ reply });
  } catch (error) {
    console.log("[api/chat] ERROR:", error);
    const msg =
      error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      {
        error: msg,
        reply:
          "Sorry — something went wrong. Please contact us on WhatsApp.",
      },
      { status: 500 }
    );
  }
}

