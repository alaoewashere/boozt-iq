"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { Link } from "@/navigation";
import { useWishlistStore } from "@/store/wishlist";
import { formatPrice } from "@/lib/utils";
import { ProductImagePlaceholder } from "@/components/product/ProductImagePlaceholder";
import { getProductDisplayName } from "@/lib/product-name";

export function WishlistView({ locale }: { locale: string }) {
  const t = useTranslations();
  const items = useWishlistStore((s) => s.items);
  const toggle = useWishlistStore((s) => s.toggle);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[3px] border border-dashed border-[rgba(154,0,2,0.2)] bg-[#110608] px-8 py-20 text-center md:py-28">
        <Heart
          className="mb-8 text-[#4D3030]"
          size={100}
          strokeWidth={0.5}
          aria-hidden
        />
        <p className="max-w-md font-body text-lg font-light text-[#9A7F7A] md:text-xl">
          {t("wishlist.empty")}
        </p>
        <Link
          href="/products"
          className="btn-luxury mt-10 inline-flex items-center justify-center rounded-[2px] border border-[#9A0002] bg-transparent px-10 py-3.5 font-body text-[0.75rem] font-medium uppercase tracking-[0.18em] text-[#9A0002] hover:bg-[#9A0002] hover:text-[#EFE6DE] hover:shadow-[0_0_28px_rgba(154,0,2,0.3)]"
        >
          {t("wishlist.browse")}
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-[1.5px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const name = getProductDisplayName(locale, item);
        const hasImg = Boolean(item.imageUrl?.trim());
        return (
          <li
            key={item.id}
            className="card-product group flex flex-col overflow-hidden rounded-[6px] border border-[rgba(255,255,255,0.04)] bg-[#110608]"
          >
            <div className="img-gradient-overlay relative aspect-square overflow-hidden bg-[#0D0506]">
              <Link href={`/product/${item.id}`} className="absolute inset-0 z-0">
                {hasImg ? (
                  <Image
                    src={item.imageUrl}
                    alt={name}
                    fill
                    className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.08]"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                ) : (
                  <ProductImagePlaceholder name={name} textClassName="text-4xl md:text-5xl" />
                )}
              </Link>
              <button
                type="button"
                className="absolute end-3 top-3 z-[3] flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(13,5,6,0.65)] backdrop-blur-[8px] transition-all duration-300 hover:text-[#9A0002]"
                aria-label={t("wishlist.toggle")}
                onClick={(e) => {
                  e.preventDefault();
                  toggle(item);
                }}
              >
                <Heart
                  className="h-4 w-4 fill-[var(--accent)] text-[var(--accent)]"
                  strokeWidth={0}
                />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-1.5 px-4 pb-4 pt-[14px]">
              <Link href={`/product/${item.id}`}>
                <h2 className="line-clamp-2 min-h-[2.5rem] font-heading text-[1.05rem] font-normal uppercase leading-[1.3] tracking-[0.04em] text-[#EFE6DE] transition-colors group-hover:text-[#9A0002]">
                  {name}
                </h2>
              </Link>
              <p className="font-body text-[0.9rem] font-medium tabular-nums text-[var(--accent)]">
                {formatPrice(item.price, locale)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
