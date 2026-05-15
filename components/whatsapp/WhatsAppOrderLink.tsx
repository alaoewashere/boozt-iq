"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCartStore } from "@/store/cart";
import { cn, formatPrice } from "@/lib/utils";
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppUrl,
  normalizeWhatsAppNumber,
} from "@/lib/whatsapp-order";
import { WhatsAppIcon } from "./WhatsAppIcon";

export function WhatsAppOrderLink({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "checkout";
}) {
  const locale = useLocale();
  const t = useTranslations("whatsapp");
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total());

  const phone = normalizeWhatsAppNumber(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  );
  if (!phone) return null;

  const message = buildWhatsAppOrderMessage(locale, items, total, formatPrice);
  const href = buildWhatsAppUrl(phone, message);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-3 rounded-xl bg-[#25D366] font-semibold text-white shadow-md transition hover:bg-[#20BD5A]",
        variant === "checkout" && "w-full px-6 py-4 text-lg",
        variant === "default" && "px-4 py-2 text-sm",
        className
      )}
    >
      <WhatsAppIcon className="h-7 w-7 shrink-0 md:h-8 md:w-8" />
      {t("orderVia")}
    </a>
  );
}
