"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Link } from "@/navigation";
import { cn } from "@/lib/utils";

type Cat = {
  category: {
    id: string;
    slug: string;
    name_en: string;
    name_ar: string;
    icon: string;
  };
  subcategories: { id: string; slug: string; name_en: string; name_ar: string }[];
};

export function MobileMenu({
  open,
  onClose,
  locale,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  locale: string;
  categories: Cat[];
}) {
  const t = useTranslations();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const name = (c: Cat["category"]) =>
    locale === "ar" ? c.name_ar : c.name_en;

  const linkCls =
    "flex min-h-[44px] items-center font-heading text-2xl uppercase tracking-[0.06em] text-[#EFE6DE] transition-colors hover:text-[var(--accent)]";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal
          aria-label={t("nav.categories")}
          className="fixed inset-0 z-[100] flex flex-col bg-[#0D0506] md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="flex h-full flex-col overflow-y-auto overscroll-contain px-6 pt-[env(safe-area-inset-top)] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <motion.div
              className="flex items-center justify-between border-b border-[rgba(154,0,2,0.15)] py-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
            >
              <Link
                href="/"
                onClick={onClose}
                className="font-heading text-[1.5rem] uppercase tracking-[0.08em] text-[#EFE6DE]"
              >
                boozt<span className="text-[#9A0002]">.</span>iq
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[#9A7F7A] transition-colors hover:text-[#9A0002]"
                aria-label={t("nav.closeMenu")}
              >
                <X className="h-6 w-6" strokeWidth={1.5} />
              </button>
            </motion.div>

            <nav className="flex flex-col gap-1 py-8">
              <Link href="/" onClick={onClose} className={linkCls}>
                {t("nav.home")}
              </Link>
              <Link href="/products" onClick={onClose} className={linkCls}>
                {t("nav.shop")}
              </Link>
              <p className="mt-6 mb-2 font-body text-[0.65rem] font-medium uppercase tracking-[0.25em] text-[#4D3030]">
                {t("nav.categories")}
              </p>
              {categories.map(({ category, subcategories }) => (
                <motion.div
                  key={category.id}
                  className="border-b border-[rgba(154,0,2,0.08)] py-3 last:border-0"
                  initial={{ opacity: 0, x: locale === "ar" ? 12 : -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    href={`/products?category=${encodeURIComponent(category.slug)}&subcategory=`}
                    onClick={onClose}
                    className={cn(linkCls, "text-xl")}
                  >
                    <span className="me-2" aria-hidden>
                      {category.icon}
                    </span>
                    {name(category)}
                  </Link>
                  {subcategories.length > 0 && (
                    <div className="mt-2 flex flex-col gap-0.5 ps-8">
                      {subcategories.map((s) => (
                        <Link
                          key={s.id}
                          href={`/products?category=${encodeURIComponent(category.slug)}&subcategory=${encodeURIComponent(s.slug)}`}
                          onClick={onClose}
                          className="flex min-h-[44px] items-center font-body text-sm font-light text-[#9A7F7A] transition-colors hover:text-[var(--accent)]"
                        >
                          {locale === "ar" ? s.name_ar : s.name_en}
                        </Link>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-3 border-t border-[rgba(154,0,2,0.12)] pt-6">
              <Link
                href="/wishlist"
                onClick={onClose}
                className="flex min-h-[44px] items-center font-body text-sm uppercase tracking-[0.14em] text-[#9A7F7A] hover:text-[#EFE6DE]"
              >
                {t("nav.wishlist")}
              </Link>
              <Link
                href="/cart"
                onClick={onClose}
                className="flex min-h-[44px] items-center font-body text-sm uppercase tracking-[0.14em] text-[#9A7F7A] hover:text-[#EFE6DE]"
              >
                {t("nav.cart")}
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
