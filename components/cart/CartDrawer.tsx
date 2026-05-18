"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus } from "lucide-react";
import Image from "next/image";
import { ProductImagePlaceholder } from "@/components/product/ProductImagePlaceholder";
import { Link } from "@/navigation";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { cartDrawerVariant } from "@/lib/animations";
import { getProductDisplayName } from "@/lib/product-name";

export function CartDrawer({ locale }: { locale: string }) {
  const t = useTranslations();
  const isRTL = locale === "ar";
  const {
    items,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    total,
  } = useCartStore();

  const drawerVar = cartDrawerVariant(isRTL);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeCart]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close overlay"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />
          <motion.aside
            role="dialog"
            aria-modal
            className="fixed top-0 z-50 flex h-full w-full max-w-full flex-col border-s border-[rgba(154,0,2,0.12)] bg-[#110608] shadow-2xl shadow-black/60 end-0 md:max-w-md"
            variants={drawerVar}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <div className="flex items-center justify-between border-b border-[rgba(154,0,2,0.12)] p-4">
              <h2 className="font-heading text-lg uppercase tracking-[0.04em] text-[#EFE6DE]">
                {t("cart.title")}
              </h2>
              <button
                type="button"
                onClick={closeCart}
                className="rounded-full p-2 text-[#9A7F7A] transition-colors duration-300 hover:text-[#9A0002]"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 text-5xl opacity-30">🛒</div>
                  <p className="font-body text-sm text-[#9A7F7A]">{t("cart.empty")}</p>
                  <Link
                    href="/"
                    className="mt-4 font-body text-sm text-[var(--accent)] transition-colors duration-300 hover:text-[var(--accent-hover)]"
                    onClick={closeCart}
                  >
                    {t("cart.continueShopping")}
                  </Link>
                </div>
              ) : (
                <ul className="flex flex-col gap-4">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex gap-3 rounded-[3px] border border-[rgba(255,255,255,0.04)] bg-[#0D0506] p-3"
                    >
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[3px] bg-[#1A080A]">
                        {item.imageUrl?.trim() ? (
                          <Image
                            src={item.imageUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <ProductImagePlaceholder
                            name={getProductDisplayName(locale, item)}
                            textClassName="text-xl"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-heading text-sm uppercase tracking-[0.04em] text-[#EFE6DE]">
                          {getProductDisplayName(locale, item)}
                        </p>
                        <p className="font-body text-xs text-[var(--accent)]">
                          {formatPrice(item.price, locale)}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-[2px] border border-[rgba(154,0,2,0.12)] p-1 text-[#9A7F7A] transition-colors hover:text-[#9A0002]"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-body text-sm tabular-nums text-[#EFE6DE]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="rounded-[2px] border border-[rgba(154,0,2,0.12)] p-1 text-[#9A7F7A] transition-colors hover:text-[#9A0002]"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            className="ms-auto font-body text-xs text-[var(--error)] transition-colors hover:text-red-400"
                            onClick={() => removeItem(item.id)}
                          >
                            {t("cart.remove")}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {items.length > 0 && (
              <div className="shrink-0 border-t border-[rgba(154,0,2,0.12)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="mb-4 flex justify-between font-body text-sm">
                  <span className="text-[#9A7F7A]">{t("cart.total")}</span>
                  <span className="font-medium text-[var(--accent)]">
                    {formatPrice(total(), locale)}
                  </span>
                </div>
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="btn-luxury block w-full rounded-[2px] border border-[#9A0002] bg-transparent py-3 text-center font-body text-[0.75rem] font-medium uppercase tracking-[0.18em] text-[#9A0002] hover:bg-[#9A0002] hover:text-[#EFE6DE] hover:shadow-[0_0_28px_rgba(154,0,2,0.3)]"
                >
                  {t("cart.checkout")}
                </Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
