/** Keep first occurrence when DB has duplicate category slugs (e.g. re-seeded data). */
export function dedupeCategoriesBySlug<
  T extends { category: { slug: string } },
>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const slug = item.category.slug;
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push(item);
  }
  return out;
}
