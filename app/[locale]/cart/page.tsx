"use client";

import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { ProductImagePlaceholder } from "@/components/product/ProductImagePlaceholder";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useRouter } from "@/navigation";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { PageHeading } from "@/components/ui/PageHeading";
import { getProductDisplayName } from "@/lib/product-name";
import { cn } from "@/lib/utils";

export default function CartPage() {
  const locale = useLocale();
  const t = useTranslations();
  const router = useRouter();
  const { items, updateQuantity, removeItem, total } = useCartStore();

  const hasItems = items.length > 0;

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-4xl px-4",
        hasItems &&
          "flex min-h-0 flex-1 flex-col max-md:max-h-[calc(100dvh-70px)] max-md:min-h-[calc(100dvh-70px)] md:block md:py-12"
      )}
    >
      <header
        className={cn(
          "flex shrink-0 items-center gap-3 border-b border-[rgba(154,0,2,0.12)]",
          hasItems ? "py-3 md:mb-8 md:border-0 md:py-0" : "mb-8 md:mb-10"
        )}
      >
        {hasItems && (
          <button
            type="button"
            onClick={() => router.back()}
            className="shrink-0 rounded-full p-2 text-[#9A7F7A] transition-colors duration-300 hover:text-[#9A0002] md:hidden"
            aria-label={t("common.back")}
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>
        )}
        {hasItems ? (
          <>
            <h1 className="min-w-0 flex-1 font-heading text-[1.8rem] font-light uppercase leading-none text-[var(--text-primary)] md:hidden">
              {t("cart.title")}
            </h1>
            <PageHeading className="mb-0 hidden md:block">
              {t("cart.title")}
            </PageHeading>
          </>
        ) : (
          <PageHeading className="mb-0">{t("cart.title")}</PageHeading>
        )}
      </header>

      {!hasItems ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 text-6xl opacity-20" aria-hidden>
            🛒
          </div>
          <p className="font-body text-sm text-[#9A7F7A]">{t("cart.empty")}</p>
          <Link
            href="/"
            className="mt-6 font-body text-sm text-[var(--accent)] transition-colors duration-300 hover:text-[var(--accent-hover)]"
          >
            {t("cart.continueShopping")}
          </Link>
        </div>
      ) : (
        <>
          <ul
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain py-3 md:flex-none md:gap-4 md:overflow-visible md:py-0"
            )}
          >
            {items.map((item) => (
              <li
                key={item.id}
                className="flex gap-3 rounded-[3px] border border-[rgba(255,255,255,0.04)] bg-[#110608] p-3 md:gap-4 md:p-4"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[3px] bg-[#1A080A] md:h-20 md:w-20">
                  {item.imageUrl?.trim() ? (
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <ProductImagePlaceholder
                      name={getProductDisplayName(locale, item)}
                      textClassName="text-xl md:text-2xl"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 min-w-0 flex-1 font-heading text-sm uppercase leading-snug tracking-[0.04em] text-[#EFE6DE]">
                      {getProductDisplayName(locale, item)}
                    </p>
                    <p className="shrink-0 font-body text-sm font-medium tabular-nums text-[var(--accent)]">
                      {formatPrice(item.price * item.quantity, locale)}
                    </p>
                  </div>
                  <p className="mt-0.5 font-body text-xs text-[var(--accent)]">
                    {formatPrice(item.price, locale)}
                  </p>
                  <div className="mt-2 flex flex-nowrap items-center gap-2">
                    <button
                      type="button"
                      className="shrink-0 rounded-[2px] border border-[rgba(154,0,2,0.12)] p-1.5 text-[#9A7F7A] transition-colors hover:text-[#9A0002]"
                      onClick={() =>
                        updateQuantity(item.id, item.quantity - 1)
                      }
                    >
                      <Minus className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <span className="shrink-0 font-body text-sm tabular-nums text-[#EFE6DE]">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 rounded-[2px] border border-[rgba(154,0,2,0.12)] p-1.5 text-[#9A7F7A] transition-colors hover:text-[#9A0002]"
                      onClick={() =>
                        updateQuantity(item.id, item.quantity + 1)
                      }
                    >
                      <Plus className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      className="ms-auto shrink-0 whitespace-nowrap font-body text-xs text-red-400 transition-colors hover:text-red-300"
                      onClick={() => removeItem(item.id)}
                    >
                      {t("cart.remove")}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <footer
            className={cn(
              "shrink-0 border-t border-[rgba(154,0,2,0.12)] bg-[#0D0506] pt-4",
              "pb-[max(5rem,calc(5rem+env(safe-area-inset-bottom,0px)))]",
              "md:mt-8 md:flex md:flex-col md:items-end md:gap-4 md:border-t md:pt-8 md:pb-0"
            )}
          >
            <div className="mb-4 flex w-full items-center justify-between gap-4 font-body text-lg md:mb-0 md:w-auto md:justify-end">
              <span className="text-[#9A7F7A]">{t("cart.total")}</span>
              <span className="font-medium tabular-nums text-[var(--accent)]">
                {formatPrice(total(), locale)}
              </span>
            </div>
            <motion.div className="w-full md:w-auto" whileTap={{ scale: 0.98 }}>
              <Link
                href="/checkout"
                className="btn-luxury block w-full rounded-[2px] border border-[#9A0002] bg-transparent px-8 py-3 text-center font-body text-[0.75rem] font-medium uppercase tracking-[0.18em] text-[#9A0002] hover:bg-[#9A0002] hover:text-[#EFE6DE] hover:shadow-[0_0_28px_rgba(154,0,2,0.3)] md:inline-block"
              >
                {t("cart.checkout")}
              </Link>
            </motion.div>
          </footer>
        </>
      )}
    </div>
  );
}
