import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rowToProductDoc, inferCategorySlugs } from "@/lib/supabase/product-map";
import { dedupeCategoriesBySlug } from "./category-dedupe";
import { filterVisibleCatalogCategories } from "./catalog-visibility";
import { serializePlainRecord } from "./serialize";
import type {
  CategoryDoc,
  CategoryTreeWithCover,
  ProductDoc,
  ReviewSerialized,
  SubcategoryDoc,
} from "./types";

export { dedupeCategoriesBySlug } from "./category-dedupe";

/** Next.js ISR-style revalidation for product-shaped reads */
export const PRODUCT_CACHE_REVALIDATE = 300;
/** Category / taxonomy reads */
export const CATEGORY_CACHE_REVALIDATE = 600;

export const CACHE_TAG_PRODUCTS = "supabase-products";
export const CACHE_TAG_CATEGORIES = "supabase-categories";
export const CACHE_TAG_ORDERS = "supabase-orders";
export const CACHE_TAG_REVIEWS = "supabase-reviews";

const MAX_PRODUCTS_SCAN = 1200;

type CatRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  icon: string;
  sort_order: number;
  product_count: number;
};

type SubRow = {
  id: string;
  category_id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  sort_order: number;
};

function countProductsForCategorySlug(
  productCategoryTexts: (string | null)[],
  targetSlug: string
): number {
  let n = 0;
  for (const c of productCategoryTexts) {
    const { categorySlug } = inferCategorySlugs(c);
    if (categorySlug === targetSlug) n++;
  }
  return n;
}

// ─── Categories ─────────────────────────────────────────────────────────────

async function fetchCategoriesTreeUncached() {
  const supa = getSupabaseAdmin();
  const [{ data: catRows, error: e1 }, { data: subRows, error: e2 }, { data: prodMeta, error: e3 }] =
    await Promise.all([
      supa.from("categories").select("*").order("sort_order", { ascending: true }),
      supa.from("subcategories").select("*").order("sort_order", { ascending: true }),
      supa.from("products").select("category").limit(MAX_PRODUCTS_SCAN),
    ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;

  const texts = (prodMeta ?? []).map((r: { category: string | null }) => r.category);
  const cats = (catRows ?? []) as CatRow[];
  const subs = (subRows ?? []) as SubRow[];

  const categories: { category: CategoryDoc; subcategories: SubcategoryDoc[] }[] = [];

  for (const c of cats) {
    const productCount = countProductsForCategorySlug(texts, c.slug);
    const subcategories = subs
      .filter((s) => s.category_id === c.id)
      .map(
        (s) =>
          ({
            id: s.id,
            name_en: s.name_en,
            name_ar: s.name_ar,
            slug: s.slug,
            order: s.sort_order,
          }) as SubcategoryDoc
      );

    categories.push({
      category: {
        id: c.id,
        name_en: c.name_en,
        name_ar: c.name_ar,
        slug: c.slug,
        icon: c.icon,
        order: c.sort_order,
        productCount,
      },
      subcategories,
    });
  }

  return dedupeCategoriesBySlug(categories);
}

const categoriesTreeCached = unstable_cache(
  fetchCategoriesTreeUncached,
  ["categories-with-subcategories"],
  {
    revalidate: CATEGORY_CACHE_REVALIDATE,
    tags: [CACHE_TAG_CATEGORIES],
  }
);

export const getCategoriesWithSubcategories = cache(() => categoriesTreeCached());

export type { CategoryTreeWithCover } from "./types";

function buildHomeMagazineCategoryTree(
  tree: { category: CategoryDoc; subcategories: SubcategoryDoc[] }[],
  products: ProductDoc[]
): CategoryTreeWithCover[] {
  const coverBySlug = new Map<string, string>();
  for (const p of products) {
    const slug = p.categorySlug?.trim();
    if (!slug || coverBySlug.has(slug)) continue;
    const url = p.imageUrl?.trim();
    if (url) coverBySlug.set(slug, url);
  }

  const visible = filterVisibleCatalogCategories(tree);
  const enriched: CategoryTreeWithCover[] = visible.map(({ category, subcategories }) => ({
    category: {
      ...category,
      coverImageUrl: coverBySlug.get(category.slug) ?? null,
    },
    subcategories,
  }));

  enriched.sort((a, b) => {
    const d =
      (b.category.productCount ?? 0) - (a.category.productCount ?? 0);
    if (d !== 0) return d;
    return (a.category.order ?? 0) - (b.category.order ?? 0);
  });

  return enriched;
}

export const getHomeMagazineCategories = cache(async (): Promise<CategoryTreeWithCover[]> => {
  const [tree, products] = await Promise.all([
    getCategoriesWithSubcategories(),
    getProductsScan(),
  ]);
  return buildHomeMagazineCategoryTree(tree, products);
});

export async function getCategoryIdBySlug(slug: string): Promise<string | null> {
  const tree = await getCategoriesWithSubcategories();
  const s = slug.trim();
  const found = tree.find(
    (c: { category: CategoryDoc }) => c.category.slug === s
  );
  return found?.category.id ?? null;
}

export async function getSubcategoryIdBySlug(
  categoryId: string,
  subSlug: string
): Promise<string | null> {
  const tree = await getCategoriesWithSubcategories();
  const cat = tree.find(
    (c: { category: CategoryDoc }) => c.category.id === categoryId
  );
  if (!cat) return null;
  const ss = subSlug.trim();
  const sub = cat.subcategories.find(
    (x: SubcategoryDoc) => x.slug === ss
  );
  return sub?.id ?? null;
}

// ─── Products ────────────────────────────────────────────────────────────────

async function fetchProductsScanUncached(): Promise<ProductDoc[]> {
  const supa = getSupabaseAdmin();
  const { data, error } = await supa
    .from("products")
    .select("*")
    .order("id", { ascending: false })
    .limit(MAX_PRODUCTS_SCAN);
  if (error) throw error;
  return (data ?? []).map((row) =>
    rowToProductDoc(
      row as {
        id: number;
        product_name: string;
        category: string | null;
        weight: string | null;
        price: string | null;
        image: string | null;
      }
    )
  );
}

const productsScanCached = unstable_cache(
  fetchProductsScanUncached,
  ["products-scan-desc", String(MAX_PRODUCTS_SCAN)],
  {
    revalidate: PRODUCT_CACHE_REVALIDATE,
    tags: [CACHE_TAG_PRODUCTS],
  }
);

export const getProductsScan = cache(() => productsScanCached());

export const getFeaturedProducts = cache(async (limit = 8) => {
  const all = await getProductsScan();
  const out: ProductDoc[] = [];
  for (const p of all) {
    if (p.isAvailable !== false) {
      out.push(p);
      if (out.length >= limit) break;
    }
  }
  return out;
});

const getCatalogProductsInner = cache(
  async (categoryId: string, subcategoryId: string, limit: number) => {
    let list = (await getProductsScan()).filter((p) => p.isAvailable !== false);
    if (categoryId) {
      list = list.filter((p) => p.categoryId === categoryId);
    }
    if (subcategoryId) {
      list = list.filter((p) => p.subcategoryId === subcategoryId);
    }
    return list.slice(0, limit);
  }
);

export async function getCatalogProducts(opts: {
  categoryId?: string;
  subcategoryId?: string;
  limit?: number;
}) {
  const limit = opts.limit ?? 24;
  return getCatalogProductsInner(
    opts.categoryId ?? "",
    opts.subcategoryId ?? "",
    limit
  );
}

export const getProductById = cache(async (id: string) =>
  unstable_cache(
    async () => {
      const supa = getSupabaseAdmin();
      const n = parseInt(id, 10);
      if (!Number.isFinite(n) || String(n) !== id.trim()) return null;
      const { data, error } = await supa
        .from("products")
        .select("*")
        .eq("id", n)
        .maybeSingle();
      if (error || !data) return null;
      return rowToProductDoc(
        data as {
          id: number;
          product_name: string;
          category: string | null;
          weight: string | null;
          price: string | null;
          image: string | null;
        }
      );
    },
    ["product", id],
    {
      revalidate: PRODUCT_CACHE_REVALIDATE,
      tags: [CACHE_TAG_PRODUCTS, `product:${id}`],
    }
  )()
);

async function fetchRelatedProductsUncached(
  categoryId: string,
  excludeId: string,
  limit: number
) {
  const all = await fetchProductsScanUncached();
  return all
    .filter((p) => p.categoryId === categoryId)
    .filter((p) => p.id !== excludeId)
    .filter((p) => p.isAvailable !== false)
    .slice(0, limit);
}

export const getRelatedProducts = cache(
  async (categoryId: string, excludeId: string, limit = 4) =>
    unstable_cache(
      async () =>
        fetchRelatedProductsUncached(categoryId, excludeId, limit),
      ["related-products", categoryId, excludeId, String(limit)],
      {
        revalidate: PRODUCT_CACHE_REVALIDATE,
        tags: [CACHE_TAG_PRODUCTS],
      }
    )()
);

// ─── Reviews ─────────────────────────────────────────────────────────────────

async function fetchApprovedReviewsForProductUncached(
  productId: string
): Promise<ReviewSerialized[]> {
  const supa = getSupabaseAdmin();
  const { data, error } = await supa
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => {
    const created = r.created_at;
    let createdAt = Date.now();
    if (typeof created === "string") {
      createdAt = new Date(created).getTime();
    }
    return {
      id: String(r.id ?? ""),
      productId: String(r.product_id ?? ""),
      reviewerName: String(r.reviewer_name ?? ""),
      rating: Number(r.rating ?? 0),
      comment: String(r.comment ?? ""),
      locale: String(r.locale ?? ""),
      approved: Boolean(r.approved),
      createdAt,
    };
  });
}

export const getApprovedReviewsForProduct = cache(async (productId: string) =>
  unstable_cache(
    async () => fetchApprovedReviewsForProductUncached(productId),
    ["reviews-approved", productId],
    {
      revalidate: PRODUCT_CACHE_REVALIDATE,
      tags: [CACHE_TAG_REVIEWS, `reviews:${productId}`],
    }
  )()
);

async function fetchPendingReviewsCountUncached(): Promise<number> {
  const supa = getSupabaseAdmin();
  const { count, error } = await supa
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("approved", false);
  if (error) throw error;
  return count ?? 0;
}

const pendingReviewsCountCached = unstable_cache(
  fetchPendingReviewsCountUncached,
  ["reviews-pending-count"],
  {
    revalidate: PRODUCT_CACHE_REVALIDATE,
    tags: [CACHE_TAG_REVIEWS],
  }
);

const getPendingReviewsCountInner = cache(() => pendingReviewsCountCached());

export async function getPendingReviewsCount(): Promise<number> {
  return getPendingReviewsCountInner();
}

export type PendingReviewAdminRow = {
  id: string;
  productId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  locale: string;
  createdAt: number;
};

async function fetchPendingReviewsListAdminUncached(): Promise<
  PendingReviewAdminRow[]
> {
  const supa = getSupabaseAdmin();
  const { data, error } = await supa
    .from("reviews")
    .select("*")
    .eq("approved", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows: PendingReviewAdminRow[] = (data ?? []).map(
    (r: Record<string, unknown>) => {
      const created = r.created_at;
      let createdAt = Date.now();
      if (typeof created === "string") {
        createdAt = new Date(created).getTime();
      }
      return {
        id: String(r.id ?? ""),
        productId: String(r.product_id ?? ""),
        reviewerName: String(r.reviewer_name ?? ""),
        rating: Number(r.rating ?? 0),
        comment: String(r.comment ?? ""),
        locale: String(r.locale ?? ""),
        createdAt,
      };
    }
  );
  return rows;
}

const pendingReviewsListAdminCached = unstable_cache(
  fetchPendingReviewsListAdminUncached,
  ["reviews-pending-admin-list"],
  {
    revalidate: PRODUCT_CACHE_REVALIDATE,
    tags: [CACHE_TAG_REVIEWS],
  }
);

const getPendingReviewsListForAdminInner = cache(() =>
  pendingReviewsListAdminCached()
);

export async function getPendingReviewsListForAdmin() {
  return getPendingReviewsListForAdminInner();
}

export function docCreatedMs(data: Record<string, unknown>): number {
  const c = data.createdAt;
  if (typeof c === "number") return c;
  if (
    c &&
    typeof c === "object" &&
    "toMillis" in c &&
    typeof (c as { toMillis: () => number }).toMillis === "function"
  ) {
    return (c as { toMillis: () => number }).toMillis();
  }
  return 0;
}

export type ProductsApiQueryKey = {
  categorySlug?: string;
  subcategorySlug?: string;
  categoryIdParam?: string;
  subcategoryIdParam?: string;
  search: string;
  page: number;
  limit: number;
  includeUnavailable?: boolean;
};

function stableJsonKey(o: ProductsApiQueryKey): string {
  return JSON.stringify({
    categorySlug: o.categorySlug ?? null,
    subcategorySlug: o.subcategorySlug ?? null,
    categoryIdParam: o.categoryIdParam ?? null,
    subcategoryIdParam: o.subcategoryIdParam ?? null,
    search: o.search,
    page: o.page,
    limit: o.limit,
    includeUnavailable: o.includeUnavailable ?? false,
  });
}

const getProductsApiListInner = cache((stableKey: string) =>
  unstable_cache(
    async () => {
      const query = JSON.parse(stableKey) as ProductsApiQueryKey;
      let resolvedSubId = query.subcategoryIdParam;

      if (query.subcategorySlug) {
        if (!query.categorySlug) {
          return {
            products: [] as Record<string, unknown>[],
            total: 0,
            page: query.page,
            totalPages: 1,
          };
        }
        const catId = await getCategoryIdBySlug(query.categorySlug);
        if (!catId) {
          return {
            products: [] as Record<string, unknown>[],
            total: 0,
            page: query.page,
            totalPages: 1,
          };
        }
        const sid = await getSubcategoryIdBySlug(catId, query.subcategorySlug);
        if (!sid) {
          return {
            products: [] as Record<string, unknown>[],
            total: 0,
            page: query.page,
            totalPages: 1,
          };
        }
        resolvedSubId = sid;
      }

      const scan = await getProductsScan();
      let rows = scan.map((p) => {
        const { id, ...rest } = p;
        return {
          id,
          ...serializePlainRecord(rest as Record<string, unknown>),
        } as Record<string, unknown> & { id: string };
      });

      if (!query.includeUnavailable) {
        rows = rows.filter((row) => row.isAvailable !== false);
      }

      if (query.categorySlug) {
        rows = rows.filter(
          (p) => String(p.categorySlug ?? "") === query.categorySlug
        );
      } else if (query.categoryIdParam) {
        rows = rows.filter(
          (p) => String(p.categoryId ?? "") === query.categoryIdParam
        );
      }

      if (resolvedSubId) {
        rows = rows.filter(
          (p) => String(p.subcategoryId ?? "") === resolvedSubId
        );
      }

      if (query.search) {
        const s = query.search.toLowerCase();
        rows = rows.filter((p) => {
          const name_en = String(p.name_en ?? "").toLowerCase();
          const name_ar = String(p.name_ar ?? "").toLowerCase();
          return name_en.includes(s) || name_ar.includes(s);
        });
      }

      const total = rows.length;
      const offset = (query.page - 1) * query.limit;
      const products = rows.slice(offset, offset + query.limit);
      const totalPages = Math.max(1, Math.ceil(total / query.limit));

      return { products, total, page: query.page, totalPages };
    },
    ["api-products-list", stableKey],
    {
      revalidate: PRODUCT_CACHE_REVALIDATE,
      tags: [CACHE_TAG_PRODUCTS],
    }
  )()
);

export async function getProductsApiListResponse(query: ProductsApiQueryKey) {
  return getProductsApiListInner(stableJsonKey(query));
}

export const getCategoriesApiPayload = cache(async () => {
  const tree = await getCategoriesWithSubcategories();
  const categories = tree.map(({ category, subcategories }) => ({
    category: {
      id: category.id,
      slug: String(category.slug ?? ""),
      ...(category as unknown as Record<string, unknown>),
    },
    subcategories: subcategories.map((s) => ({
      id: s.id,
      ...(s as unknown as Record<string, unknown>),
    })),
  }));
  return { categories: dedupeCategoriesBySlug(categories) };
});
