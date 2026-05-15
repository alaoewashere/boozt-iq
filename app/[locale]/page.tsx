import { getTranslations } from "next-intl/server";
import {
  getCatalogProducts,
  getCategoryIdBySlug,
  getFeaturedProducts,
  getHomeMagazineCategories,
} from "@/lib/server-data";
import type { ProductDoc } from "@/lib/types";
import { ProductCard } from "@/components/product/ProductCard";
import { toProductCardData } from "@/lib/product-mapper";
import {
  HeroSection,
  CategoryGrid,
  ProductGridMotion,
  ProductWrap,
} from "@/components/home/HomeSections";
import { Link } from "@/navigation";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    category?: string;
    sub?: string;
    categorySlug?: string;
  }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations();
  const tProducts = await getTranslations("products");

  let magazineCategories: Awaited<
    ReturnType<typeof getHomeMagazineCategories>
  > = [];
  let gridProducts: ProductDoc[] = [];
  let hasFilter = false;
  let dataErrorKey: "dataLoad" | null = null;

  try {
    const resolvedCategoryId =
      sp.category ??
      (sp.categorySlug
        ? await getCategoryIdBySlug(sp.categorySlug)
        : null) ??
      undefined;

    hasFilter = Boolean(resolvedCategoryId || sp.sub);
    magazineCategories = await getHomeMagazineCategories();
    gridProducts = hasFilter
      ? await getCatalogProducts({
          categoryId: resolvedCategoryId,
          subcategoryId: sp.sub,
          limit: 24,
        })
      : await getFeaturedProducts(8);
  } catch (e) {
    console.error("[HomePage] Data load failed:", e);
    dataErrorKey = "dataLoad";
  }

  return (
    <div className="min-h-screen bg-[#0D0506]">
      {dataErrorKey && (
        <div
          role="alert"
          className="border-b border-[rgba(154,0,2,0.25)] bg-[rgba(154,0,2,0.08)] px-6 py-3 text-center font-body text-sm text-[var(--accent)]"
        >
          {t("common.dataLoadError")}
        </div>
      )}
      <HeroSection
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        cta={t("hero.cta")}
        locale={locale}
      />

      <CategoryGrid categories={magazineCategories} locale={locale} />

      <section id="shop" className="mx-auto max-w-[1280px] px-6 py-16">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-heading text-[2.6rem] uppercase leading-none text-[#EFE6DE]">
            {hasFilter ? t("categories.all") : tProducts("featured")}
          </h2>
          <div className="flex items-center gap-4">
            {!hasFilter && (
              <Link
                href="/products"
                className="group flex items-center gap-1 font-body text-[0.78rem] font-light tracking-[0.1em] text-[#9A7F7A] transition-colors duration-300 hover:text-[var(--accent)]"
              >
                {tProducts("viewAll")}
                <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            )}
            {hasFilter && (
              <Link
                href="/"
                className="font-body text-[0.78rem] font-light tracking-[0.1em] text-[#9A7F7A] transition-colors duration-300 hover:text-[var(--accent)]"
                scroll={false}
              >
                {t("categories.all")}
              </Link>
            )}
          </div>
        </div>
        <div className="gold-rule mb-8" />
        <ProductGridMotion>
          {gridProducts.map((p) => (
            <ProductWrap key={p.id}>
              <ProductCard
                product={toProductCardData(p)}
                locale={locale}
              />
            </ProductWrap>
          ))}
        </ProductGridMotion>
        {gridProducts.length === 0 && !dataErrorKey && (
          <p className="py-12 text-center font-body text-sm text-[#4D3030]">
            {t("catalog.emptyTitle")}
          </p>
        )}
      </section>
    </div>
  );
}
