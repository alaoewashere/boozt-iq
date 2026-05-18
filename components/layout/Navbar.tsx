"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ShoppingBag,
  ChevronDown,
  Heart,
  Menu,
} from "lucide-react";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { motion, AnimatePresence } from "framer-motion";
import { Link, usePathname } from "@/navigation";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { cn } from "@/lib/utils";
import { filterVisibleCatalogCategories } from "@/lib/catalog-visibility";

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

export function Navbar({ locale }: { locale: string }) {
  const t = useTranslations();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Cat[]>([]);
  const itemCount = useCartStore((s) => s.itemCount());
  const openCart = useCartStore((s) => s.openCart);
  const wishCount = useWishlistStore((s) => s.count());

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) =>
        setCategories(filterVisibleCatalogCategories(d.categories ?? []))
      )
      .catch(() => setCategories([]));
  }, []);

  const otherLocale = locale === "en" ? "ar" : "en";
  const name = (c: Cat["category"]) =>
    locale === "ar" ? c.name_ar : c.name_en;

  const navLinkCls =
    "nav-link-luxe font-body text-[0.75rem] font-light uppercase tracking-[0.14em] text-[#9A7F7A] transition-colors duration-300 hover:text-[#EFE6DE]";
  const iconCls =
    "relative inline-flex rounded-full p-2 text-[#9A7F7A] transition-all duration-300 hover:text-[#9A0002]";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-300",
        "border-b border-[rgba(154,0,2,0.2)]",
        scrolled
          ? "bg-[rgba(13,5,6,0.88)] shadow-lg shadow-black/40 backdrop-blur-[22px] backdrop-saturate-[180%]"
          : "bg-[rgba(13,5,6,0.88)] backdrop-blur-[22px] backdrop-saturate-[180%]"
      )}
    >
      <motion.div className="mx-auto flex h-[70px] max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[#9A7F7A] transition-colors duration-300 hover:text-[#9A0002] md:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label={t("nav.openMenu")}
            aria-expanded={mobileMenuOpen}
          >
            <Menu size={22} strokeWidth={1.5} />
          </button>
          <Link
            href="/"
            className="flex shrink-0 items-baseline gap-0 font-heading text-[1.5rem] uppercase tracking-[0.08em] text-[#EFE6DE] sm:text-[1.7rem]"
          >
            <span>boozt</span>
            <span className="text-[#9A0002]">.</span>
            <span>iq</span>
          </Link>
        </div>

        <nav className="hidden flex-1 items-center justify-center gap-8 md:flex">
          <Link href="/" className={navLinkCls}>
            {t("nav.home")}
          </Link>
          <span className="text-[#4D3030]" aria-hidden>·</span>
          <Link href="/products" className={navLinkCls}>
            {t("nav.shop")}
          </Link>
          <span className="text-[#4D3030]" aria-hidden>·</span>
          <div
            className="relative"
            onMouseEnter={() => setCatOpen(true)}
            onMouseLeave={() => setCatOpen(false)}
          >
            <button
              type="button"
              className={cn(navLinkCls, "flex items-center gap-1")}
            >
              {t("nav.categories")}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
            <AnimatePresence>
              {catOpen && categories.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute start-1/2 top-full z-50 mt-3 min-w-[260px] -translate-x-1/2 rounded-[3px] border border-[rgba(154,0,2,0.2)] bg-[#110608] py-3 shadow-2xl shadow-black/60"
                >
                  {categories.map(({ category, subcategories }) => (
                    <div key={category.id} className="px-4 py-2">
                      <Link
                        href={`/products?category=${encodeURIComponent(category.slug)}&subcategory=`}
                        className="mb-1 flex items-center gap-2 font-heading text-sm uppercase tracking-[0.04em] text-[#EFE6DE] transition-colors hover:text-[var(--accent)]"
                      >
                        <span>{category.icon}</span>
                        {name(category)}
                      </Link>
                      <div className="ms-8 flex flex-col gap-1">
                        {subcategories.map((s) => (
                          <Link
                            key={s.id}
                            href={`/products?category=${encodeURIComponent(category.slug)}&subcategory=${encodeURIComponent(s.slug)}`}
                            className="text-xs font-light text-[#9A7F7A] transition-colors hover:text-[var(--accent)]"
                          >
                            {locale === "ar" ? s.name_ar : s.name_en}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href={pathname}
            locale={otherLocale}
            className="flex min-h-[44px] items-center px-1 font-body text-[0.75rem] font-light uppercase tracking-[0.14em] text-[#9A7F7A] transition-colors duration-300 hover:text-[#EFE6DE]"
          >
            {locale === "en" ? "العربية" : "English"}
          </Link>
          <Link
            href="/wishlist"
            className={cn(iconCls, "min-h-[44px] min-w-[44px] items-center justify-center")}
            aria-label={t("nav.wishlist")}
          >
            <Heart size={19} strokeWidth={1.5} />
            {mounted && wishCount > 0 && (
              <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--accent)] px-0.5 text-[9px] font-bold text-[#EFE6DE]">
                {wishCount > 9 ? "9+" : wishCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            className={cn(iconCls, "hidden min-h-[44px] min-w-[44px] items-center justify-center md:inline-flex")}
            onClick={() => openCart()}
            aria-label={t("nav.cart")}
          >
            <ShoppingBag size={19} strokeWidth={1.5} />
            {mounted && itemCount > 0 && (
              <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--accent)] px-0.5 text-[9px] font-bold text-[#EFE6DE]">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </button>
        </div>
      </motion.div>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        locale={locale}
        categories={categories}
      />
    </header>
  );
}
