import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Groq from "groq-sdk";
import { getAreaLabel } from "@/lib/checkout-areas";
import { getOrderByIdCached } from "@/lib/server-data-orders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const bodySchema = z.object({
  orderNumber: z.string().optional(),
  conversationHistory: z.array(messageSchema).default([]),
  locale: z.enum(["en", "ar"]).optional(),
});

const ORDER_TRACKING_SYSTEM = `You are an order tracking assistant for Boozt.iq, an Iraqi lifestyle shop. You help customers track their orders.

LANGUAGE RULE: Always reply in the SAME language the customer writes in. Arabic → full Arabic reply. English → full English reply. NEVER mix languages.

Order statuses and what to say:
- pending → 'Your order is received and being processed'
- confirmed → 'Your order is confirmed and being prepared'
- shipped → 'Your order is on the way to you'
- delivered → 'Your order has been delivered successfully'
- cancelled → 'Your order has been cancelled, contact WhatsApp for help'

If the stored status is preparing, treat it like confirmed for the customer message. If the stored status is "out for delivery" or legacy shipped, treat it like shipped (on the way).

Always be friendly, use emojis, and keep replies short.

Answer follow-ups using ONLY the order data provided (e.g. delivery estimates based on status; cancellation only if status is pending; address changes → say to contact WhatsApp). Do not invent tracking numbers or dates not implied by the data.`;

const NOT_FOUND = {
  ar: "عذراً، لم نجد طلباً بهذا الرقم. تأكد من الرقم أو تواصل معنا على واتساب",
  en: "Sorry, we could not find an order with this number. Please check the number or contact us on WhatsApp",
} as const;

function detectLang(text: string): "ar" | "en" {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
    text
  )
    ? "ar"
    : "en";
}

function resolveLang(
  history: z.infer<typeof messageSchema>[],
  locale?: "en" | "ar"
): "ar" | "en" {
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  if (lastUser?.content?.trim()) return detectLang(lastUser.content);
  if (locale === "ar" || locale === "en") return locale;
  return "en";
}

/** Order ID: no slashes, reasonable length (avoids path tricks). */
function normalizeOrderId(raw: string | undefined): string | null {
  const s = (raw ?? "").trim();
  if (s.length < 4 || s.length > 256) return null;
  if (s.includes("/") || s.includes("..")) return null;
  return s;
}

type OrderItemRow = {
  productId: string;
  name_en: string;
  name_ar: string;
  price: number;
  quantity: number;
  imageUrl: string;
};

function toIso(createdAt: unknown): string | null {
  if (createdAt == null) return null;
  if (typeof createdAt === "number") {
    return new Date(createdAt).toISOString();
  }
  if (
    typeof createdAt === "object" &&
    createdAt !== null &&
    "toMillis" in createdAt &&
    typeof (createdAt as { toMillis: () => number }).toMillis === "function"
  ) {
    try {
      const ms = (createdAt as { toMillis: () => number }).toMillis();
      return new Date(ms).toISOString();
    } catch {
      return null;
    }
  }
  if (
    typeof createdAt === "object" &&
    createdAt !== null &&
    "toDate" in createdAt &&
    typeof (createdAt as { toDate: () => Date }).toDate === "function"
  ) {
    try {
      return (createdAt as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  if (createdAt instanceof Date) return createdAt.toISOString();
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { conversationHistory, locale } = parsed.data;
    const orderId = normalizeOrderId(parsed.data.orderNumber);
    const lang = resolveLang(conversationHistory, locale);

    if (!orderId) {
      return NextResponse.json({
        found: false,
        order: null,
        reply: NOT_FOUND[lang],
      });
    }

    const row = await getOrderByIdCached(orderId);
    if (!row) {
      return NextResponse.json({
        found: false,
        order: null,
        reply: NOT_FOUND[lang],
      });
    }

    const data = row as Record<string, unknown>;
    const itemsRaw = Array.isArray(data.items) ? data.items : [];
    const items: OrderItemRow[] = itemsRaw.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        productId: String(r.productId ?? ""),
        name_en: String(r.name_en ?? ""),
        name_ar: String(r.name_ar ?? ""),
        price: Number(r.price ?? 0),
        quantity: Number(r.quantity ?? 0),
        imageUrl: String(r.imageUrl ?? ""),
      };
    });

    const area = data.area != null ? String(data.area) : "";
    const customerAddress =
      data.customerAddress != null ? String(data.customerAddress) : "";
    const deliveryAddress =
      customerAddress.trim() ||
      (area ? getAreaLabel(area, lang) : "—");

    const status = String(data.status ?? "pending");
    const customerName = String(data.customerName ?? "");
    const totalPrice = Number(data.total ?? 0);
    const createdAt = toIso(data.createdAt);

    const orderPayload = {
      orderNumber: orderId,
      status,
      items: items.map((it) => ({
        name_en: it.name_en,
        name_ar: it.name_ar,
        quantity: it.quantity,
        unitPrice: it.price,
        lineTotal: it.price * it.quantity,
      })),
      totalPrice,
      createdAt,
      customerName,
      deliveryAddress,
    };

    const orderResponse = {
      orderNumber: orderPayload.orderNumber,
      status: orderPayload.status,
      items: orderPayload.items,
      totalPrice: orderPayload.totalPrice,
      createdAt: orderPayload.createdAt,
      customerName: orderPayload.customerName,
      deliveryAddress: orderPayload.deliveryAddress,
    };

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Server is missing GROQ_API_KEY",
          found: true,
          order: orderResponse,
          reply:
            lang === "ar"
              ? "تم العثور على طلبك أدناه. للمساعدة تواصل معنا على واتساب 💬"
              : "Your order is shown below. For help, contact us on WhatsApp 💬",
        },
        { status: 200 }
      );
    }

    let rawReply: string;
    try {
      const groq = new Groq({ apiKey });
      const historySlice = conversationHistory
        .filter((m) => m.content && typeof m.content === "string")
        .slice(-5);

      const orderJson = JSON.stringify(orderPayload);
      const systemWithOrder = `${ORDER_TRACKING_SYSTEM}\n\nCurrent order (JSON, private — never mention other orders):\n${orderJson}`;

      const completionMessages: {
        role: "system" | "user" | "assistant";
        content: string;
      }[] = [{ role: "system", content: systemWithOrder }];

      if (historySlice.length === 0) {
        completionMessages.push({
          role: "user",
          content:
            lang === "ar"
              ? "أريد معرفة حالة طلبي. أعطني ملخصًا ودّيًا قصيرًا."
              : "I'd like an update on my order. Give me a short friendly summary.",
        });
      } else {
        for (const m of historySlice) {
          completionMessages.push({
            role: m.role,
            content: m.content,
          });
        }
      }

      const completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        temperature: 0.4,
        max_tokens: 400,
        messages: completionMessages,
      });

      rawReply =
        completion.choices?.[0]?.message?.content?.trim() ||
        (lang === "ar"
          ? "شكرًا لتواصلك! إذا احتجت مساعدة، راسلنا على واتساب 💬"
          : "Thanks for reaching out! If you need anything else, message us on WhatsApp 💬");
    } catch (groqErr) {
      console.error("[order-tracking] Groq error:", groqErr);
      rawReply =
        lang === "ar"
          ? "تم العثور على طلبك أدناه. للمساعدة تواصل معنا على واتساب 💬"
          : "Your order is shown below. For help, contact us on WhatsApp 💬";
    }

    return NextResponse.json({
      found: true,
      order: orderResponse,
      reply: rawReply,
    });
  } catch (e) {
    console.error("[order-tracking]", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      {
        error: msg,
        found: false,
        order: null,
        reply:
          "Sorry, we could not check your order right now. Please try again or contact us on WhatsApp.",
      },
      { status: 500 }
    );
  }
}
