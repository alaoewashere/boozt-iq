"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useRouter } from "@/navigation";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import {
  buildCheckoutWhatsAppMessage,
  buildWhatsAppUrl,
  normalizeWhatsAppNumber,
  PENDING_CHECKOUT_WA_URL_KEY,
} from "@/lib/whatsapp-order";
import { cn } from "@/lib/utils";
import { CHECKOUT_CITY } from "@/lib/checkout-areas";
import { normalizeIqPhoneDigits, isValidIqPhoneDigits } from "@/lib/phone-iq";
import { ProductImagePlaceholder } from "@/components/product/ProductImagePlaceholder";
import { Link } from "@/navigation";
import { PageHeading } from "@/components/ui/PageHeading";
import { getProductDisplayName } from "@/lib/product-name";

function buildSchema(t: (k: string) => string) {
  return z.object({
    customerName: z.string().trim().min(2, t("validationName")),
    customerPhone: z
      .string()
      .transform((s) => normalizeIqPhoneDigits(s))
      .refine((d) => isValidIqPhoneDigits(d), t("validationPhone")),
    notes: z.string().trim().min(1, t("validationNotes")),
  });
}

type FormData = z.infer<ReturnType<typeof buildSchema>>;

const inputCls =
  "min-h-[44px] w-full rounded-[2px] border border-[rgba(154,0,2,0.1)] bg-[#1A080A] px-4 font-body text-base font-light text-[#EFE6DE] placeholder:text-[#4D3030] transition-all duration-300 focus:border-[rgba(154,0,2,0.5)] focus:shadow-[0_0_0_3px_rgba(154,0,2,0.08)] focus:outline-none md:text-sm";

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const router = useRouter();
  const { items, total } = useCartStore();
  const [submitError, setSubmitError] = useState("");

  const schema = useMemo(() => buildSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const subtotal = total();
  const deliveryNote = t("deliveryNote");
  const grandTotal = subtotal;

  const onSubmit = async (data: FormData) => {
    setSubmitError("");
    const payload = {
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      area: CHECKOUT_CITY,
      notes: data.notes.trim(),
      items: items.map((i) => ({
        productId: i.id,
        name_en: i.name_en,
        price: i.price,
        quantity: i.quantity,
        imageUrl: i.imageUrl || "",
      })),
      total: grandTotal,
    };

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setSubmitError(
        typeof err?.error === "string"
          ? err.error
          : t("submitError")
      );
      return;
    }

    const j = (await res.json()) as { id: string };
    const orderId = j.id;

    const waDigits = normalizeWhatsAppNumber(
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    );
    if (waDigits) {
      const message = buildCheckoutWhatsAppMessage({
        locale,
        orderId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        areaId: CHECKOUT_CITY,
        notes: data.notes,
        items,
        total: grandTotal,
      });
      const waUrl = buildWhatsAppUrl(waDigits, message);
      try {
        sessionStorage.setItem(PENDING_CHECKOUT_WA_URL_KEY, waUrl);
      } catch {
        /* private mode / quota */
      }
    }

    router.push(`/order-success?orderId=${encodeURIComponent(orderId)}`);
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="font-body text-sm text-[#9A7F7A]">{t("emptyCart")}</p>
        <Link
          href="/cart"
          className="mt-4 inline-block font-body text-sm text-[var(--accent)] transition-colors duration-300 hover:text-[var(--accent-hover)]"
        >
          {t("backToCart")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 py-4 md:py-12">
      <header className="mb-4 shrink-0 md:mb-10">
        <PageHeading className="mb-0">{t("title")}</PageHeading>
      </header>

      <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto overscroll-contain pb-36 md:grid-cols-2 md:items-start md:gap-10 md:overflow-visible md:pb-0">
        {/* Order summary — below form on mobile */}
        <section
          className="order-2 rounded-[3px] border border-[rgba(154,0,2,0.12)] bg-[#110608] p-5 md:order-none md:p-6"
          aria-labelledby="order-summary-heading"
        >
          <h2
            id="order-summary-heading"
            className="mb-5 font-heading text-lg uppercase tracking-[0.04em] text-[#EFE6DE]"
          >
            {t("yourOrder")}
          </h2>
          <ul className="space-y-4">
            {items.map((item) => {
              const name = getProductDisplayName(locale, item);
              const line = item.price * item.quantity;
              return (
                <li
                  key={item.id}
                  className="flex gap-3 border-b border-[rgba(255,255,255,0.06)] pb-4 last:border-0 last:pb-0"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[3px] bg-[#1A080A]">
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
                        name={name}
                        textClassName="text-2xl"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-sm uppercase tracking-[0.04em] text-[#EFE6DE]">
                      {name}
                    </p>
                    <p className="mt-1 font-body text-xs font-light text-[#4D3030]">
                      {t("qty")}: {item.quantity}
                    </p>
                  </div>
                  <div className="shrink-0 text-end font-body text-sm font-medium tabular-nums text-[var(--accent)]">
                    {formatPrice(line, locale)}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 space-y-3 border-t border-[rgba(154,0,2,0.12)] pt-5">
            <div className="flex justify-between font-body text-sm font-light">
              <span className="text-[#9A7F7A]">{t("subtotal")}</span>
              <span className="tabular-nums text-[#EFE6DE]">
                {formatPrice(subtotal, locale)}
              </span>
            </div>
            <p className="font-body text-xs font-light leading-relaxed text-[#4D3030]">
              {deliveryNote}
            </p>
            <div className="flex justify-between border-t border-[rgba(154,0,2,0.12)] pt-4 font-body text-lg font-medium text-[#EFE6DE]">
              <span>{t("grandTotal")}</span>
              <span className="tabular-nums text-[var(--accent)]">
                {formatPrice(grandTotal, locale)}
              </span>
            </div>
          </div>
        </section>

        {/* Form — first on mobile */}
        <section className="order-1 rounded-[3px] border border-[rgba(154,0,2,0.12)] bg-[#110608] p-5 md:order-none md:p-6">
          <h2 className="mb-5 font-heading text-lg uppercase tracking-[0.04em] text-[#EFE6DE]">
            {t("yourDetails")}
          </h2>
          <form
            id="checkout-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="checkout-name"
                className="mb-1.5 block font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-[#4D3030]"
              >
                {t("name")}
              </label>
              <input
                id="checkout-name"
                autoComplete="name"
                {...register("customerName")}
                className={inputCls}
                placeholder={t("namePlaceholder")}
              />
              {errors.customerName && (
                <p className="mt-1 font-body text-xs text-red-400">
                  {errors.customerName.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="checkout-phone"
                className="mb-1.5 block font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-[#4D3030]"
              >
                {t("phone")}
              </label>
              <input
                id="checkout-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                {...register("customerPhone")}
                className={inputCls}
                placeholder="07XX-XXX-XXXX"
              />
              {errors.customerPhone && (
                <p className="mt-1 font-body text-xs text-red-400">
                  {errors.customerPhone.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="checkout-city"
                className="mb-1.5 block font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-[#4D3030]"
              >
                {t("city")}
              </label>
              <motion.div
                id="checkout-city"
                role="textbox"
                aria-readonly="true"
                className={`${inputCls} flex cursor-default items-center bg-[#14090b] text-[#9A7F7A]`}
              >
                {locale === "ar" ? "بغداد" : CHECKOUT_CITY}
              </motion.div>
            </div>

            <div>
              <label
                htmlFor="checkout-notes"
                className="mb-1.5 block font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-[#4D3030]"
              >
                {t("notes")}
              </label>
              <textarea
                id="checkout-notes"
                rows={5}
                required
                {...register("notes")}
                className="min-h-[140px] w-full resize-y rounded-[2px] border border-[rgba(154,0,2,0.1)] bg-[#1A080A] px-4 py-3 font-body text-base font-light text-[#EFE6DE] placeholder:text-[#4D3030] transition-all duration-300 focus:border-[rgba(154,0,2,0.5)] focus:shadow-[0_0_0_3px_rgba(154,0,2,0.08)] focus:outline-none md:text-sm"
                placeholder={t("notesPlaceholder")}
              />
              {errors.notes && (
                <p className="mt-1 font-body text-xs text-red-400">{errors.notes.message}</p>
              )}
            </div>

            {submitError && (
              <p className="rounded-[2px] border border-red-500/20 bg-red-500/10 px-3 py-2 font-body text-sm text-red-400">
                {submitError}
              </p>
            )}

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileTap={{ scale: 0.98 }}
              className="btn-luxury mt-2 hidden h-12 w-full items-center justify-center rounded-[2px] border border-[#9A0002] bg-transparent font-body text-[0.75rem] font-medium uppercase tracking-[0.18em] text-[#9A0002] hover:bg-[#9A0002] hover:text-[#EFE6DE] hover:shadow-[0_0_28px_rgba(154,0,2,0.3)] disabled:cursor-not-allowed disabled:opacity-40 md:flex"
            >
              {isSubmitting ? t("submitting") : t("confirm")}
            </motion.button>
          </form>
        </section>
      </div>

      {/* Mobile: sticky place-order bar above bottom nav */}
      <footer
        className={cn(
          "fixed inset-x-0 z-[45] border-t border-[rgba(154,0,2,0.15)] bg-[rgba(13,5,6,0.97)] px-4 py-3 backdrop-blur-xl md:hidden",
          "bottom-[max(4.25rem,calc(4.25rem+env(safe-area-inset-bottom,0px)))]",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        )}
      >
        <motion.div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-body text-[0.65rem] font-medium uppercase tracking-[0.12em] text-[#4D3030]">
              {t("grandTotal")}
            </p>
            <p className="font-body text-lg font-medium tabular-nums text-[var(--accent)]">
              {formatPrice(grandTotal, locale)}
            </p>
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={isSubmitting}
            className="btn-luxury flex min-h-[44px] shrink-0 items-center justify-center rounded-[2px] border border-[#9A0002] bg-[#9A0002] px-5 py-3 font-body text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[#EFE6DE] shadow-[0_0_22px_rgba(154,0,2,0.35)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? t("submitting") : t("confirm")}
          </button>
        </motion.div>
      </footer>
    </div>
  );
}
