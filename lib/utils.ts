export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatPrice(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-IQ" : "en-IQ", {
    style: "currency",
    currency: "IQD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
