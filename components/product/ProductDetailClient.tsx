"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ProductImagePlaceholder } from "./ProductImagePlaceholder";
import { motion } from "framer-motion";
import { Minus, Plus, Heart } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { cn, formatPrice } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";
import { PageHeading } from "@/components/ui/PageHeading";
import { getProductDisplayName } from "@/lib/product-name";

const CATEGORY_KEYS = ["hookah", "vape", "pods", "boardgames", "nicotine", "cigarettes"] as const;

export type ProductDetail = {
  id: string;
  name_en: string;
  description_en: string;
  description_ar: string;
  price: number;
  stock: number;
  imageUrl: string;
  isAvailable: boolean;
  categorySlug: string;
};

export function ProductDetailClient({
  product,
  locale,
}: {
  product: ProductDetail;
  locale: string;
}) {
  const t = useTranslations();
  const tCats = useTranslations("categories");
  const addItem = useCartStore((s) => s.addItem);
  const toggleWish = useWishlistStore((s) => s.toggle);
  const wishHas = useWishlistStore((s) => s.has(product.id));
  const mounted = useMounted();
  const wishFilled = mounted && wishHas;

  const [qty, setQty] = useState(1);
  const [imgError, setImgError] = useState(false);
  const name = getProductDisplayName(locale, product);
  const desc = locale === "ar" ? product.description_ar : product.description_en;
  const inStock = product.stock > 0 && product.isAvailable;

  const slug = product.categorySlug;
  const categoryTag =
    slug && (CATEGORY_KEYS as readonly string[]).includes(slug)
      ? tCats(slug as (typeof CATEGORY_KEYS)[number])
      : slug || null;

  const wishItem = () => ({
    id: product.id,
    name_en: product.name_en,
    price: product.price,
    imageUrl: product.imageUrl?.trim() || "",
    categorySlug: product.categorySlug,
  });

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) {
      addItem({
        id: product.id,
        name_en: product.name_en,
        price: product.price,
        imageUrl: product.imageUrl,
      });
    }
  };

  return (
    <>
      <div className="relative aspect-square overflow-hidden rounded-[3px] border border-[rgba(255,255,255,0.04)] bg-[#0D0506] lg:sticky lg:top-28 lg:self-start">
        {product.imageUrl?.trim() && !imgError ? (
          <Image
            src={product.imageUrl}
            alt={name}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            onError={() => setImgError(true)}
          />
        ) : (
          <ProductImagePlaceholder name={name} textClassName="text-5xl md:text-6xl" />
        )}
      </div>
      <div className="flex flex-col gap-6 pt-2 lg:pt-0">
        {categoryTag && (
          <span className="badge-accent inline-flex w-fit items-center rounded-[2px] px-3 py-1 font-body text-[0.6rem] font-medium uppercase tracking-[0.15em]">
            {categoryTag}
          </span>
        )}
        <PageHeading className="mb-0">{name}</PageHeading>
        <p className="font-body text-[2rem] font-medium tabular-nums text-[var(--accent)] md:text-[2.5rem]">
          {formatPrice(product.price, locale)}
        </p>
        <p className="whitespace-pre-wrap font-body text-base font-light leading-relaxed text-[#9A7F7A]">
          {desc}
        </p>
        <div className="flex items-center gap-2.5 font-body text-sm font-light">
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              inStock ? "bg-[var(--accent)]" : "bg-red-500"
            )}
            aria-hidden
          />
          <span className={inStock ? "text-[var(--accent)]" : "text-red-400"}>
            {inStock
              ? t("product.stockIn", { count: product.stock })
              : t("product.stockOut")}
          </span>
        </div>
        <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="mx-auto flex items-center justify-center gap-2 rounded-[3px] border border-[rgba(255,255,255,0.04)] bg-[#110608] p-1 sm:mx-0">
            <button
              type="button"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[2px] text-[#9A7F7A] transition-colors duration-300 hover:text-[#9A0002]"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label={t("product.qtyDecrease")}
            >
              <Minus className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <span className="min-w-[2.5rem] text-center font-body text-base font-medium tabular-nums text-[#EFE6DE]">
              {qty}
            </span>
            <button
              type="button"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[2px] text-[#9A7F7A] transition-colors duration-300 hover:text-[#9A0002] disabled:opacity-30"
              onClick={() =>
                setQty((q) => Math.min(product.stock || 99, q + 1))
              }
              disabled={!inStock}
              aria-label={t("product.qtyIncrease")}
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            disabled={!inStock}
            onClick={handleAdd}
            className="btn-luxury flex min-h-[44px] w-full items-center justify-center rounded-[2px] border border-[#9A0002] bg-transparent px-8 py-3.5 font-body text-base font-medium uppercase tracking-[0.18em] text-[#9A0002] hover:bg-[#9A0002] hover:text-[#EFE6DE] hover:shadow-[0_0_28px_rgba(154,0,2,0.3)] disabled:cursor-not-allowed disabled:opacity-30 sm:min-w-[180px] sm:w-auto"
          >
            {t("product.addToCart")}
          </motion.button>
          <button
            type="button"
            className="mx-auto flex h-12 min-h-[44px] w-12 items-center justify-center rounded-full border border-[rgba(154,0,2,0.25)] transition-all duration-300 hover:border-[#9A0002] hover:shadow-[0_0_22px_rgba(154,0,2,0.22)] sm:mx-0"
            aria-label={t("wishlist.toggle")}
            onClick={() => toggleWish(wishItem())}
          >
            <Heart
              className={cn(
                "h-5 w-5",
                wishFilled
                  ? "fill-[var(--accent)] text-[var(--accent)]"
                  : "text-[#9A7F7A]"
              )}
              strokeWidth={wishFilled ? 0 : 1.5}
            />
          </button>
        </div>
      </div>
    </>
  );
}
