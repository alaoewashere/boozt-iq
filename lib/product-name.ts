/**
 * Locale-aware product title with fallback when one language is missing
 * or legacy data duplicated Arabic into `name_en`.
 */
export function getProductDisplayName(
  locale: string | undefined,
  product: { name_en?: string | null; name_ar?: string | null }
): string {
  const en = String(product.name_en ?? "").trim();
  const ar = String(product.name_ar ?? "").trim();
  if (locale === "ar") return ar || en;
  return en || ar;
}

/** True if the string contains Arabic script (common ranges). */
export function containsArabicScript(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
    text
  );
}
