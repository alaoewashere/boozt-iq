/** Categories not shown in storefront navigation / filters (e.g. import staging). */
export const HIDDEN_STOREFRONT_CATEGORY_SLUGS = new Set(["imported"]);

export function filterVisibleCatalogCategories<
  T extends { category: { slug: string } },
>(rows: T[]): T[] {
  return rows.filter(
    (row) => !HIDDEN_STOREFRONT_CATEGORY_SLUGS.has(row.category.slug)
  );
}
