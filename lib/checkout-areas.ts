/** City stored on every order (checkout is Baghdad-only). */
export const CHECKOUT_CITY = "Baghdad" as const;

export const CHECKOUT_AREAS = [
  { id: "baghdad", en: "Baghdad", ar: "بغداد" },
] as const;

export type CheckoutAreaId = (typeof CHECKOUT_AREAS)[number]["id"];

export function getAreaLabel(
  id: string,
  locale: string
): string {
  if (id === CHECKOUT_CITY || id === "baghdad") {
    return locale === "ar" ? "بغداد" : CHECKOUT_CITY;
  }
  const row = CHECKOUT_AREAS.find((a) => a.id === id);
  if (!row) return id;
  return locale === "ar" ? row.ar : row.en;
}
