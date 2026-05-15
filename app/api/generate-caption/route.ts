import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Groq from "groq-sdk";
import { verifyAdmin } from "@/lib/verify-admin";

export const dynamic = "force-dynamic";

const InputSchema = z.object({
  productName: z.string().trim().min(1),
  price: z.union([z.number(), z.string()]),
  category: z.enum(["vape", "hookah", "accessories", "drinks"]),
});

const OutputSchema = z.object({
  ar: z.object({
    instagram: z.string().min(1),
    tiktok: z.string().min(1),
    whatsapp: z.string().min(1),
  }),
  en: z.object({
    instagram: z.string().min(1),
    tiktok: z.string().min(1),
    whatsapp: z.string().min(1),
  }),
});

function buildPrompt(input: z.infer<typeof InputSchema>) {
  const priceNumber =
    typeof input.price === "number"
      ? input.price
      : Number(String(input.price).replace(/[^\d.]/g, ""));
  const priceText = Number.isFinite(priceNumber)
    ? `${Math.round(priceNumber).toLocaleString("en-US")} IQD`
    : String(input.price);

  return `Product:\n- Name: ${input.productName}\n- Category: ${input.category}\n- Price: ${priceText}\n\nReturn ONLY valid JSON in this exact shape:\n{\n  \"ar\": {\"instagram\":\"...\",\"tiktok\":\"...\",\"whatsapp\":\"...\"},\n  \"en\": {\"instagram\":\"...\",\"tiktok\":\"...\",\"whatsapp\":\"...\"}\n}\n\nRules:\n- Generate captions in BOTH Arabic and English.\n- Mention the price naturally.\n- Arabic should use trending Iraqi slang (but keep it readable).\n- Instagram: engaging + emojis + relevant hashtags, max 150 words.\n- TikTok: short viral hook + emojis + hashtags, max 50 words.\n- WhatsApp status: very short personal recommendation, max 20 words.\n- Include platform-specific hashtags like #بوزت #العراق #vape #hookah and category-relevant tags.\n- Do not include any extra keys. Do not wrap JSON in markdown fences.`;
}

async function generateOnce(input: z.infer<typeof InputSchema>) {
  const rawKey = process.env.GROQ_API_KEY;
  // Debug (safe): do NOT log the key itself.
  console.log("[generate-caption] env check", {
    hasGroqKey: Boolean(rawKey && rawKey.trim().length > 0),
    keyLength: rawKey ? rawKey.length : 0,
    nodeEnv: process.env.NODE_ENV,
  });

  const apiKey = rawKey?.trim();
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const client = new Groq({ apiKey });

  const system =
    'You are a social media expert for an Iraqi lifestyle shop called Boozt.iq that sells vapes, hookahs, and accessories. Generate exciting, trendy captions that appeal to young Iraqis. Always include emojis and relevant hashtags.';

  const msg = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.8,
    max_tokens: 650,
    messages: [
      { role: "system", content: system },
      { role: "user", content: buildPrompt(input) },
    ],
  });

  return String(msg.choices?.[0]?.message?.content ?? "").trim();
}

export async function POST(req: NextRequest) {
  try {
    await verifyAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;

  const tryParse = (raw: string) => {
    const json = JSON.parse(raw);
    return OutputSchema.parse(json);
  };

  try {
    const raw1 = await generateOnce(input);
    try {
      const out = tryParse(raw1);
      return NextResponse.json(out);
    } catch {
      const raw2 = await generateOnce({
        ...input,
        productName: input.productName,
      });
      const out2 = tryParse(raw2);
      return NextResponse.json(out2);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Generation failed", message: msg }, { status: 500 });
  }
}

