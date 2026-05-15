"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppUrl,
  normalizeWhatsAppNumber,
} from "@/lib/whatsapp-order";
import { WhatsAppIcon } from "./WhatsAppIcon";

export function WhatsAppFloatingButton() {
  const locale = useLocale();
  const t = useTranslations("whatsapp");
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total());

  const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const phone = normalizeWhatsAppNumber(raw);
  if (!phone) return null;

  const message = buildWhatsAppOrderMessage(locale, items, total, formatPrice);
  const href = buildWhatsAppUrl(phone, message);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(154,0,2,0.25)] bg-[rgba(17,6,8,0.95)] text-[#9A0002] shadow-lg shadow-black/30 backdrop-blur-[12px] transition-all duration-300 hover:border-[#9A0002] hover:shadow-[0_0_22px_rgba(154,0,2,0.22)]"
      aria-label={t("floatAria")}
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
