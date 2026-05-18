"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { toProductCardData } from "@/lib/product-mapper";
import type { CategoryDoc, ProductDoc, SubcategoryDoc } from "@/lib/types";
import { cn } from "@/lib/utils";
import { HIDDEN_STOREFRONT_CATEGORY_SLUGS } from "@/lib/catalog-visibility";

export type CatalogCategoryRow = {
  category: CategoryDoc;
  subcategories: SubcategoryDoc[];
};

const productGridClass =
  "grid grid-cols-2 gap-3 p-4 md:grid-cols-3 lg:grid-cols-4 lg:p-6";

function buildPageItems(
  current: number,
  totalPages: number
): (number | "ellipsis")[] {
  if (totalPages <= 1) return [1];
  const pages = new Set<number>([1, totalPages]);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const items: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i]!;
    if (i > 0 && n - sorted[i - 1]! > 1) items.push("ellipsis");
    items.push(n);
  }
  return items;
}

const paginationBtnBase =
  "min-h-[44px] rounded-[2px] border border-[rgba(154,0,2,0.12)] bg-[#110608] px-3 py-1.5 font-body text-sm font-light text-[#9A7F7A] transition-all duration-200 hover:border-[rgba(154,0,2,0.35)] hover:text-[#EFE6DE]";

function CatalogPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
}) {
  const items = buildPageItems(page, totalPages);

  return (
    <nav
      className="mb-4 mt-8 flex animate-fadeInUp flex-wrap items-center justify-center gap-1.5 opacity-100 transition-opacity duration-300"
      aria-label="Product pages"
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={cn(
          paginationBtnBase,
          "disabled:pointer-events-none disabled:opacity-40"
        )}
      >
        « Prev
      </button>
      {items.map((item, idx) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${idx}`}
            className="px-1 font-body text-sm text-[#4D3030]"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              "min-w-[2.25rem] rounded-[2px] border px-3 py-1.5 font-body text-sm font-light transition-all duration-200",
              item === page
                ? "border-[#9A0002] bg-[#9A0002] text-[#EFE6DE] shadow-[0_0_18px_rgba(154,0,2,0.35)]"
                : cn(
                    paginationBtnBase,
                    "bg-[#1A080A] text-[#EFE6DE]"
                  )
            )}
          >
            {item}
          </button>
        )
      )}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className={cn(
          paginationBtnBase,
          "disabled:pointer-events-none disabled:opacity-40"
        )}
      >
        Next »
      </button>
    </nav>
  );
}

function SubcategoryChipScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mt-3">
      <div
        className="pointer-events-none absolute end-0 top-0 z-10 h-full w-10 bg-gradient-to-l from-[#0d0506] via-[#0d0506]/70 to-transparent"
        aria-hidden
      />
      <div className="scrollbar-hide flex flex-nowrap gap-2 overflow-x-auto pb-1">
        {children}
      </div>
    </div>
  );
}

export function ProductsCatalog({
  locale,
  categories,
}: {
  locale: string;
  categories: CatalogCategoryRow[];
}) {
  const t = useTranslations("catalog");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const categorySlug = searchParams.get("category") ?? "";
  const subcategorySlug = searchParams.get("subcategory") ?? "";
  const searchFromUrl = searchParams.get("search") ?? "";

  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (row) => !HIDDEN_STOREFRONT_CATEGORY_SLUGS.has(row.category.slug)
      ),
    [categories]
  );

  const effectiveCategorySlug =
    categorySlug && !HIDDEN_STOREFRONT_CATEGORY_SLUGS.has(categorySlug)
      ? categorySlug
      : "";

  const [searchInput, setSearchInput] = useState(searchFromUrl);
  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const gridTopRef = useRef<HTMLDivElement>(null);

  const showFullCategory =
    Boolean(effectiveCategorySlug) && !subcategorySlug.trim();
  const catalogLimit = showFullCategory ? 1200 : 48;

  useEffect(() => {
    setSearchInput(searchFromUrl);
  }, [searchFromUrl]);

  const replaceQuery = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(searchParams.toString());
      mutate(p);
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    if (!categorySlug || !HIDDEN_STOREFRONT_CATEGORY_SLUGS.has(categorySlug))
      return;
    replaceQuery((p) => {
      p.delete("category");
      p.delete("subcategory");
    });
  }, [categorySlug, replaceQuery]);

  useEffect(() => {
    const tid = window.setTimeout(() => {
      const next = searchInput.trim();
      if (next === searchFromUrl) return;
      replaceQuery((p) => {
        if (next) p.set("search", next);
        else p.delete("search");
      });
    }, 350);
    return () => window.clearTimeout(tid);
  }, [searchInput, searchFromUrl, replaceQuery]);

  useEffect(() => {
    setPage(1);
  }, [effectiveCategorySlug, subcategorySlug, searchFromUrl]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams();
    if (effectiveCategorySlug) qs.set("category", effectiveCategorySlug);
    if (effectiveCategorySlug && subcategorySlug)
      qs.set("subcategory", subcategorySlug);
    if (searchFromUrl) qs.set("search", searchFromUrl);
    qs.set("limit", String(catalogLimit));
    qs.set("page", String(page));

    fetch(`/api/products?${qs.toString()}`)
      .then((r) => r.json())
      .then(
        (d: {
          products?: ProductDoc[];
          total?: number;
          page?: number;
          totalPages?: number;
        }) => {
        if (cancelled) return;
        setProducts((d.products ?? []) as ProductDoc[]);
        setTotal(typeof d.total === "number" ? d.total : 0);
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveCategorySlug, subcategorySlug, searchFromUrl, page, catalogLimit]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / catalogLimit)),
    [total, catalogLimit]
  );

  const showPagination = total > catalogLimit;

  const goToPage = useCallback((next: number) => {
    const clamped = Math.min(Math.max(1, next), totalPages);
    setPage(clamped);
    gridTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [totalPages]);

  const selectedRow = useMemo(
    () =>
      categories.find((c) => c.category.slug === effectiveCategorySlug),
    [categories, effectiveCategorySlug]
  );

  const setCategory = (slug: string | null) => {
    replaceQuery((p) => {
      if (slug) {
        p.set("category", slug);
        p.delete("subcategory");
      } else {
        p.delete("category");
        p.delete("subcategory");
      }
    });
  };

  const setSubcategory = (slug: string | null) => {
    replaceQuery((p) => {
      if (slug) p.set("subcategory", slug);
      else p.delete("subcategory");
    });
  };

  const catName = (c: CategoryDoc) =>
    locale === "ar" ? c.name_ar : c.name_en;
  const subName = (s: SubcategoryDoc) =>
    locale === "ar" ? s.name_ar : s.name_en;

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 sm:py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="relative inline-block font-heading text-[3rem] uppercase leading-none text-[#EFE6DE]">
            {t("title")}
            <span className="absolute -bottom-2 start-0 h-[2px] w-[50px] bg-[#9A0002]" />
          </h1>
        </div>
        <div className="relative w-full max-w-md">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4D3030]"
            aria-hidden
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="min-h-[44px] w-full rounded-[2px] border border-[rgba(154,0,2,0.1)] bg-[#1A080A] py-2 ps-10 pe-4 font-body text-base font-light text-[#EFE6DE] placeholder:text-[#4D3030] transition-all duration-300 focus:border-[rgba(154,0,2,0.5)] focus:shadow-[0_0_0_3px_rgba(154,0,2,0.08)] focus:outline-none md:text-sm"
            aria-label={t("searchPlaceholder")}
          />
        </div>
      </div>

      {/* Mobile: horizontal category tabs */}
      <div className="mb-6 lg:hidden">
        <div className="-mx-1 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={cn(
              "flex min-h-[44px] shrink-0 items-center rounded-[2px] border px-4 py-2 font-body text-[0.8rem] font-light whitespace-nowrap transition-colors",
              !effectiveCategorySlug
                ? "border-[var(--accent)] bg-[rgba(154,0,2,0.1)] text-[var(--accent)]"
                : "border-[rgba(154,0,2,0.12)] text-[#9A7F7A]"
            )}
          >
            {t("allCategories")}
          </button>
          {visibleCategories.map(({ category: c }) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.slug)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-[2px] border px-4 py-2 font-body text-[0.8rem] font-light transition-colors",
                effectiveCategorySlug === c.slug
                  ? "border-[var(--accent)] bg-[rgba(154,0,2,0.1)] text-[var(--accent)]"
                  : "border-[rgba(154,0,2,0.12)] text-[#9A7F7A]"
              )}
            >
              <span aria-hidden>{c.icon}</span>
              {catName(c)}
            </button>
          ))}
        </div>
        {selectedRow && selectedRow.subcategories.length > 0 && (
          <SubcategoryChipScroll>
            <button
              type="button"
              onClick={() => setSubcategory(null)}
              className={cn(
                "flex min-h-[44px] shrink-0 items-center rounded-[2px] border px-3 py-1.5 font-body text-xs font-light whitespace-nowrap",
                !subcategorySlug
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-[rgba(154,0,2,0.12)] text-[#4D3030]"
              )}
            >
              {t("allSubs")}
            </button>
            {selectedRow.subcategories.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSubcategory(s.slug)}
                className={cn(
                  "flex min-h-[44px] shrink-0 items-center rounded-[2px] border px-3 py-1.5 font-body text-xs font-light whitespace-nowrap transition-colors",
                  subcategorySlug === s.slug
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-[rgba(154,0,2,0.12)] text-[#9A7F7A]"
                )}
              >
                {subName(s)}
              </button>
            ))}
          </SubcategoryChipScroll>
        )}
      </div>

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
        {/* Desktop sidebar */}
        <aside className="hidden w-[240px] shrink-0 rounded-[3px] border-e border-[rgba(154,0,2,0.1)] bg-[#0D0506] p-5 lg:block">
          <p className="mb-4 font-body text-[0.65rem] font-medium uppercase tracking-[0.25em] text-[#4D3030]">
            {t("filters")}
          </p>
          <nav className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={cn(
                "rounded-[2px] px-3 py-2 text-start font-body text-[0.85rem] font-light transition-all duration-300",
                !effectiveCategorySlug
                  ? "border-s-2 border-[#9A0002] ps-[10px] text-[#EFE6DE]"
                  : "text-[#9A7F7A] hover:text-[#EFE6DE]"
              )}
            >
              {t("allCategories")}
            </button>
            {visibleCategories.map(({ category: c }) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.slug)}
                className={cn(
                  "flex items-center gap-2 rounded-[2px] px-3 py-2 text-start font-body text-[0.85rem] font-light transition-all duration-300",
                  effectiveCategorySlug === c.slug
                    ? "border-s-2 border-[#9A0002] ps-[10px] text-[#EFE6DE]"
                    : "text-[#9A7F7A] hover:text-[#EFE6DE]"
                )}
              >
                <span className="text-lg">{c.icon}</span>
                {catName(c)}
              </button>
            ))}
          </nav>
          {selectedRow && selectedRow.subcategories.length > 0 && (
            <>
              <div className="gold-rule my-4" />
              <p className="mb-3 font-body text-[0.65rem] font-medium uppercase tracking-[0.25em] text-[#4D3030]">
                {t("subcategories")}
              </p>
              <nav className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => setSubcategory(null)}
                  className={cn(
                    "rounded-[2px] px-3 py-1.5 text-start font-body text-[0.85rem] font-light",
                    !subcategorySlug
                      ? "text-[#EFE6DE]"
                      : "text-[#4D3030] hover:text-[#EFE6DE]"
                  )}
                >
                  {t("allSubs")}
                </button>
                {selectedRow.subcategories.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSubcategory(s.slug)}
                    className={cn(
                      "rounded-[2px] px-3 py-1.5 text-start font-body text-[0.85rem] font-light transition-colors",
                      subcategorySlug === s.slug
                        ? "text-[#EFE6DE]"
                        : "text-[#9A7F7A] hover:text-[#EFE6DE]"
                    )}
                  >
                    {subName(s)}
                  </button>
                ))}
              </nav>
            </>
          )}
        </aside>

        <div ref={gridTopRef} className="min-w-0 flex-1 scroll-mt-24">
          <p className="mb-4 font-body text-[0.78rem] font-light tracking-[0.05em] text-[#4D3030]">
            {loading ? t("loadingResults") : t("resultsCount", { count: total })}
          </p>

          {loading ? (
            <div className={productGridClass}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton-gold aspect-[3/4] rounded-[6px]"
                />
              ))}
            </div>
          ) : total === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[3px] border border-dashed border-[rgba(154,0,2,0.2)] bg-[#110608] py-20 text-center">
              <span className="mb-4 text-5xl" aria-hidden>
                🛒
              </span>
              <p className="max-w-sm font-heading text-lg text-[var(--text-primary)]">
                {t("emptyTitle")}
              </p>
              <p className="mt-2 max-w-sm font-body text-sm font-light text-[#4D3030]">
                {t("emptyHint")}
              </p>
            </div>
          ) : (
            <>
              <div className={productGridClass}>
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={toProductCardData(p as ProductDoc)}
                    locale={locale}
                  />
                ))}
              </div>
              {showPagination && (
                <CatalogPagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
