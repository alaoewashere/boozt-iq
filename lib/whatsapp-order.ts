import type { CartItem } from "@/store/cart";
import { getAreaLabel } from "@/lib/checkout-areas";
import { buildOrderTrackUrl } from "@/lib/order-track-url";
import { getProductDisplayName } from "@/lib/product-name";

/** Digits only, international format (e.g. 9647XXXXXXXXX). */
export function normalizeWhatsAppNumber(raw: string | undefined): string {
  if (!raw?.trim()) return "";
  return raw.replace(/\D/g, "");
}

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Replace Western digits with Arabic-Indic numerals for WhatsApp copy. */
export function toArabicIndicNumerals(input: string): string {
  return input.replace(/\d/g, (d) => AR_DIGITS[Number(d)] ?? d);
}

export type CheckoutWhatsAppPayload = {
  locale: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  areaId: string;
  notes?: string;
  items: CartItem[];
  total: number;
};

function formatIqdAmount(amount: number): string {
  return Math.round(amount).toLocaleString("en-US");
}

/** Message sent to WhatsApp after checkout (includes tracking link). */
export function buildCheckoutWhatsAppMessage(p: CheckoutWhatsAppPayload): string {
  const { locale, orderId, customerName, customerPhone, areaId, notes, items, total } =
    p;
  const areaLabel = getAreaLabel(areaId, locale);
  const trackUrl = buildOrderTrackUrl(locale, orderId);
  const displayLocale = locale === "ar" ? "ar" : "en";

  const itemLines = items
    .map((i) => {
      const name = getProductDisplayName(displayLocale, i);
      const lineTotal = i.price * i.quantity;
      return `- ${name} x${i.quantity} = ${formatIqdAmount(lineTotal)} IQD`;
    })
    .join("\n");

  const notesText = notes?.trim() ? notes.trim() : "—";

  return [
    "🧾 New Order from Boozt.IQ",
    "",
    "🔢 Your Tracking Code:",
    orderId,
    "",
    "🔗 Track your order here:",
    trackUrl,
    "",
    "👆 Save this link to check your order status anytime!",
    "",
    "━━━━━━━━━━━━━━━",
    `Customer: ${customerName}`,
    `Phone: ${customerPhone}`,
    `Area: ${areaLabel}`,
    "",
    "Items:",
    itemLines,
    "",
    `Total: ${formatIqdAmount(total)} IQD`,
    `Notes: ${notesText}`,
    "━━━━━━━━━━━━━━━",
    "Please confirm this order as soon as possible.",
  ].join("\n");
}

export function buildWhatsAppOrderMessage(
  locale: string,
  items: CartItem[],
  total: number,
  formatPrice: (amount: number, locale: string) => string
): string {
  if (items.length === 0) {
    return locale === "ar"
      ? "مرحباً، أود الطلب من boozt.iq"
      : "Hello — I'd like to place an order on boozt.iq";
  }

  const lines: string[] = [];
  if (locale === "ar") {
    lines.push("طلب جديد — boozt.iq");
    lines.push("");
    lines.push("العناصر:");
    for (const i of items) {
      const lineTotal = i.price * i.quantity;
      lines.push(
        `- ${getProductDisplayName("ar", i)} ×${toArabicIndicNumerals(String(i.quantity))} = ${formatPrice(lineTotal, locale)}`
      );
    }
    lines.push("");
    lines.push(`الإجمالي: ${formatPrice(total, locale)}`);
  } else {
    lines.push("New order — boozt.iq");
    lines.push("");
    lines.push("Items:");
    for (const i of items) {
      const lineTotal = i.price * i.quantity;
      lines.push(
        `- ${getProductDisplayName("en", i)} x${i.quantity} = ${formatPrice(lineTotal, locale)}`
      );
    }
    lines.push("");
    lines.push(`Total: ${formatPrice(total, locale)}`);
  }
  return lines.join("\n");
}

export function buildWhatsAppUrl(phoneDigits: string, message: string): string {
  const base = `https://wa.me/${phoneDigits}`;
  const q = new URLSearchParams({ text: message });
  return `${base}?${q.toString()}`;
}
