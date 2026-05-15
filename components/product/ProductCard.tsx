"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";
import { Plus, Heart } from "lucide-react";
import { Link } from "@/navigation";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { ProductImagePlaceholder } from "./ProductImagePlaceholder";
import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";
import { getProductDisplayName } from "@/lib/product-name";

export type ProductCardData = {
  id: string;
  name_en: string;
  name_ar: string;
  price: number;
  stock: number;
  isAvailable: boolean;
  imageUrl: string;
  categorySlug?: string;
};

const CATEGORY_KEYS = ["hookah", "vape", "pods", "boardgames", "nicotine", "cigarettes"] as const;

export function ProductCard({
  product,
  locale,
  subcategoryLabel,
}: {
  product: ProductCardData;
  locale: string;
  subcategoryLabel?: string;
}) {
  const t = useTranslations();
  const tCats = useTranslations("categories");
  const addItem = useCartStore((s) => s.addItem);
  const toggleWish = useWishlistStore((s) => s.toggle);
  const wishHas = useWishlistStore((s) => s.has(product.id));
  const mounted = useMounted();
  const wishFilled = mounted && wishHas;
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const name = getProductDisplayName(locale, product);
  const inStock = product.stock > 0 && product.isAvailable;
  const [imgError, setImgError] = useState(false);

  const hasRemoteImage = Boolean(product.imageUrl?.trim()) && !imgError;

  const slug = product.categorySlug;
  const categoryTag =
    subcategoryLabel ||
    (slug && (CATEGORY_KEYS as readonly string[]).includes(slug)
      ? tCats(slug as (typeof CATEGORY_KEYS)[number])
      : slug || null);

  const wishItem = () => ({
    id: product.id,
    name_en: product.name_en,
    name_ar: product.name_ar,
    price: product.price,
    imageUrl: product.imageUrl?.trim() || "",
    categorySlug: product.categorySlug,
  });

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={cn(
        "card-product group relative flex min-w-0 flex-col overflow-hidden rounded-[6px] border border-[rgba(255,255,255,0.04)] bg-[#110608]",
        visible ? "animate-fadeInUp" : "opacity-0"
      )}
    >
      <div className="img-gradient-overlay relative aspect-square overflow-hidden bg-[#0D0506]">
        <Link href={`/product/${product.id}`} className="absolute inset-0 z-0">
          {hasRemoteImage ? (
            <Image
              src={product.imageUrl}
              alt={name}
              fill
              className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.08]"
              sizes="(max-width: 768px) 50vw, 25vw"
              onError={() => setImgError(true)}
            />
          ) : (
            <ProductImagePlaceholder name={name} />
          )}
          {!product.isAvailable && (
            <div className="absolute inset-0 z-[2] flex items-center justify-center bg-black/50">
              <span className="rounded-[2px] bg-black/70 px-3 py-1.5 font-body text-[0.65rem] font-medium uppercase tracking-[0.1em] text-white">
                {t("product.outOfStock")}
              </span>
            </div>
          )}
        </Link>

        {categoryTag && (
          <span className="badge-accent absolute start-3 top-3 z-[3] rounded-[2px] px-2.5 py-1 uppercase">
            {categoryTag}
          </span>
        )}

        <button
          type="button"
          className="absolute end-3 top-3 z-[3] flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(13,5,6,0.65)] backdrop-blur-[8px] transition-all duration-300 hover:text-[#9A0002]"
          aria-label={t("wishlist.toggle")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWish(wishItem());
          }}
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              wishFilled
                ? "fill-[var(--accent)] text-[var(--accent)]"
                : "text-[#9A7F7A]"
            )}
            strokeWidth={wishFilled ? 0 : 1.5}
          />
        </button>
      </div>

      <div className="relative flex flex-1 flex-col gap-1.5 px-3 pb-4 pe-11 pt-[14px] sm:px-4 sm:pe-12">
        <Link href={`/product/${product.id}`}>
          <h3 className="line-clamp-2 min-h-[2rem] font-heading text-[1rem] uppercase leading-[1.3] text-[#EFE6DE] transition-colors group-hover:text-[var(--accent)] sm:min-h-[2.5rem] sm:text-[1.15rem]">
            {name}
          </h3>
        </Link>
        <span className="font-body text-[0.9rem] font-medium tabular-nums text-[#9A0002]">
          {formatPrice(product.price, locale)}
        </span>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          disabled={!inStock}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!inStock) return;
            addItem({
              id: product.id,
              name_en: product.name_en,
              name_ar: product.name_ar,
              price: product.price,
              imageUrl: product.imageUrl?.trim() || "",
            });
          }}
          className="absolute bottom-4 end-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#9A0002] text-[#EFE6DE] shadow-lg transition-all duration-300 hover:scale-[1.12] hover:bg-[#C4000A] hover:shadow-[0_0_22px_rgba(154,0,2,0.5)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
          aria-label={t("product.addToCart")}
        >
          <Plus size={18} strokeWidth={2.5} />
        </motion.button>
      </div>
    </div>
  );
}
