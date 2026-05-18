"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Link } from "@/navigation";
import { useCartStore } from "@/store/cart";
import { PageHeading } from "@/components/ui/PageHeading";
import { WhatsAppIcon } from "@/components/whatsapp/WhatsAppIcon";
import { PENDING_CHECKOUT_WA_URL_KEY } from "@/lib/whatsapp-order";

export function OrderSuccessClient() {
  const t = useTranslations("orderSuccess");
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const clearCart = useCartStore((s) => s.clearCart);
  const cleared = useRef(false);
  const [waHref, setWaHref] = useState<string | null>(null);

  useEffect(() => {
    if (cleared.current) return;
    cleared.current = true;
    clearCart();
  }, [clearCart]);

  useEffect(() => {
    try {
      const url = sessionStorage.getItem(PENDING_CHECKOUT_WA_URL_KEY);
      if (url) {
        sessionStorage.removeItem(PENDING_CHECKOUT_WA_URL_KEY);
        setWaHref(url);
      }
    } catch {
      /* private mode */
    }
  }, []);

  return (
    <motion.div className="mx-auto flex max-w-lg flex-col items-center px-4 py-12 text-center md:py-24">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-success/15 text-success ring-4 ring-success/10 dark:bg-success/20 dark:ring-success/20"
        aria-hidden
      >
        <Check className="h-14 w-14" strokeWidth={2.5} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="w-full"
      >
        <PageHeading align="center" className="mb-0" titleClassName="text-2xl md:text-3xl">
          {t("title")}
        </PageHeading>
        {orderId && (
          <p className="mt-4 font-mono text-sm text-[var(--text-muted)]">
            {t("orderIdLabel")}{" "}
            <span className="text-[var(--text-secondary)]">{orderId}</span>
          </p>
        )}
        <p className="mt-6 leading-relaxed text-[var(--text-secondary)]">
          {t("whatsappLine")}
        </p>

        {waHref && (
          <motion.a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            whileTap={{ scale: 0.98 }}
            className="mt-8 inline-flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#25D366]/25 transition hover:brightness-110"
          >
            <WhatsAppIcon className="h-6 w-6 shrink-0" />
            {t("openWhatsApp")}
          </motion.a>
        )}

        <motion.div className="mt-6" whileTap={{ scale: 0.98 }}>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[rgba(154,0,2,0.35)] bg-transparent px-8 py-2.5 text-sm font-medium text-[#9A7F7A] transition hover:border-[#9A0002] hover:text-[#EFE6DE]"
          >
            {t("backToShop")}
          </Link>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
