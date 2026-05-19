/** Public order tracking page URL (locale-aware, mobile-friendly). */
export function buildOrderTrackUrl(locale: string, orderId: string): string {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://boozt-iq.vercel.app"
  ).replace(
    /\/$/,
    ""
  );
  const loc = locale === "ar" ? "ar" : "en";
  return `${base}/${loc}/track?order=${encodeURIComponent(orderId)}`;
}
