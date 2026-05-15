"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Link } from "@/navigation";
import { useCartStore } from "@/store/cart";
import { PageHeading } from "@/components/ui/PageHeading";

export function OrderSuccessClient() {
  const t = useTranslations("orderSuccess");
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const clearCart = useCartStore((s) => s.clearCart);
  const cleared = useRef(false);

  useEffect(() => {
    if (cleared.current) return;
    cleared.current = true;
    clearCart();
  }, [clearCart]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center md:py-24">
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
        <motion.div
          className="mt-10"
          whileTap={{ scale: 0.98 }}
        >
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-8 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-sm transition hover:bg-accent-hover"
          >
            {t("backToShop")}
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
