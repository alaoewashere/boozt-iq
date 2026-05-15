"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { fadeUp, staggerContainer } from "@/lib/animations";
import type { CategoryTreeWithCover } from "@/lib/types";

const SmokeParticles = dynamic(
  () =>
    import("@/components/home/SmokeParticles").then((m) => m.SmokeParticles),
  { ssr: false }
);

function splitHeroTitle(title: string, locale: string) {
  if (locale === "ar") {
    const key = "المميز";
    const i = title.indexOf(key);
    if (i >= 0) {
      return {
        before: title.slice(0, i),
        accent: key,
        after: title.slice(i + key.length),
      };
    }
  } else {
    const lower = title.toLowerCase();
    const key = "premium";
    const idx = lower.indexOf(key);
    if (idx >= 0) {
      const actual = title.slice(idx, idx + key.length);
      return {
        before: title.slice(0, idx),
        accent: actual,
        after: title.slice(idx + actual.length),
      };
    }
  }
  return { before: title, accent: null as string | null, after: "" };
}

export function HeroSection({
  title,
  subtitle,
  cta,
  locale,
}: {
  title: string;
  subtitle: string;
  cta: string;
  eyebrow: string;
  locale: string;
}) {
  const { before, accent, after } = splitHeroTitle(title, locale);

  return (
    <section className="hero-bg relative flex min-h-[100dvh] min-h-[100vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      <SmokeParticles />
      <div className="relative z-[1] mx-auto max-w-5xl px-2">
        <motion.span
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mb-10 inline-block font-body text-[0.7rem] font-extralight uppercase tracking-[0.3em] text-[#4D3030]"
        >
          PREMIUM LIFESTYLE · IRAQ
        </motion.span>
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.05 }}
          className="mb-8 font-heading uppercase leading-none text-[clamp(5rem,12vw,9rem)] text-[#EFE6DE]"
        >
          {accent ? (
            <>
              {before}
              <span className="text-[var(--accent)]">{accent}</span>
              {after}
            </>
          ) : (
            title
          )}
        </motion.h1>
        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.1 }}
          className="mx-auto mb-14 max-w-[420px] font-body text-[1rem] font-light leading-relaxed text-[#9A7F7A]"
        >
          {subtitle}
        </motion.p>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: 0.15 }}
        >
          <Link href="/#shop" scroll={false} className="inline-block">
            <motion.span
              className="btn-luxury inline-block rounded-[2px] border border-[#9A0002] bg-transparent px-11 py-[14px] font-body text-[0.75rem] font-medium uppercase tracking-[0.18em] text-[#9A0002]"
              whileHover={{
                backgroundColor: "#9A0002",
                color: "#EFE6DE",
                boxShadow: "0 0 35px rgba(154,0,2,0.35)",
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {cta}
            </motion.span>
          </Link>
        </motion.div>
      </div>
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
        className="absolute bottom-10 z-[1] text-[rgba(154,0,2,0.35)]"
        aria-hidden
      >
        <ChevronDown size={24} strokeWidth={1.5} />
      </motion.div>
    </section>
  );
}

export function CategoryGrid({
  categories,
  locale,
}: {
  categories: CategoryTreeWithCover[];
  locale: string;
}) {
  const t = useTranslations("categories");
  const displayCats = categories.slice(0, 4);
  const count = categories.length;
  const [c0, c1, c2, c3] = displayCats;

  const catName = (c: (typeof displayCats)[number] | undefined) =>
    c
      ? locale === "ar"
        ? c.category.name_ar
        : c.category.name_en
      : "";

  const productsHref = (slug: string) =>
    `/products?category=${encodeURIComponent(slug)}&subcategory=`;

  return (
    <section className="categories-section mx-auto max-w-[1280px] px-6">
      <div className="cat-header">
        <h2 className="cat-section-title">{t("title")}</h2>
        <span className="cat-section-count">{t("metaCount", { count })}</span>
      </div>

      <div className="cat-magazine-grid">
        {c0 && (
          <Link
            href={productsHref(c0.category.slug)}
            className="cat-big-card"
            scroll={false}
          >
            {c0.category.coverImageUrl ? (
              <Image
                src={c0.category.coverImageUrl}
                alt={catName(c0)}
                fill
                className="cat-card-media"
                sizes="(max-width: 768px) 100vw, 45vw"
                priority
              />
            ) : null}
            <div className="cat-big-overlay" aria-hidden />
            <div className="cat-big-content">
              <span className="cat-tag">{t("magazineHeroTag")}</span>
              <h3 className="cat-big-name">{catName(c0)}</h3>
              <p className="cat-big-count">
                {c0.category.productCount ?? 0} {t("products")}
              </p>
              <div className="cat-big-line" aria-hidden />
            </div>
          </Link>
        )}

        <div className="cat-right-grid">
          <div className="cat-top-row">
            {c1 && (
              <Link
                href={productsHref(c1.category.slug)}
                className="cat-sm-card"
                scroll={false}
              >
                {c1.category.coverImageUrl ? (
                  <Image
                    src={c1.category.coverImageUrl}
                    alt={catName(c1)}
                    fill
                    className="cat-card-media"
                    sizes="(max-width: 768px) 50vw, 28vw"
                  />
                ) : null}
                <div className="cat-sm-overlay" aria-hidden />
                <div className="cat-sm-content">
                  <h3 className="cat-sm-name">{catName(c1)}</h3>
                  <p className="cat-sm-count">
                    {c1.category.productCount ?? 0} {t("products")}
                  </p>
                </div>
                <div className="cat-sm-bar" aria-hidden />
              </Link>
            )}
            {c2 && (
              <Link
                href={productsHref(c2.category.slug)}
                className="cat-sm-card"
                scroll={false}
              >
                {c2.category.coverImageUrl ? (
                  <Image
                    src={c2.category.coverImageUrl}
                    alt={catName(c2)}
                    fill
                    className="cat-card-media"
                    sizes="(max-width: 768px) 50vw, 28vw"
                  />
                ) : null}
                <div className="cat-sm-overlay" aria-hidden />
                <div className="cat-sm-content">
                  <h3 className="cat-sm-name">{catName(c2)}</h3>
                  <p className="cat-sm-count">
                    {c2.category.productCount ?? 0} {t("products")}
                  </p>
                </div>
                <div className="cat-sm-bar" aria-hidden />
              </Link>
            )}
          </div>

          {c3 && (
            <Link
              href={productsHref(c3.category.slug)}
              className="cat-wide-card"
              scroll={false}
            >
              {c3.category.coverImageUrl ? (
                <Image
                  src={c3.category.coverImageUrl}
                  alt={catName(c3)}
                  fill
                  className="cat-card-media"
                  sizes="(max-width: 768px) 100vw, 55vw"
                />
              ) : null}
              <div className="cat-sm-overlay" aria-hidden />
              <div className="cat-sm-content">
                <h3 className="cat-sm-name">{catName(c3)}</h3>
                <p className="cat-sm-count">
                  {c3.category.productCount ?? 0} {t("products")}
                </p>
              </div>
              <div className="cat-sm-bar" aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export function ProductGridMotion({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="grid grid-cols-2 gap-5 p-4 md:grid-cols-3 lg:grid-cols-4 lg:p-6"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={staggerContainer}
    >
      {children}
    </motion.div>
  );
}

export function ProductWrap({ children }: { children: React.ReactNode }) {
  return <motion.div variants={fadeUp}>{children}</motion.div>;
}
