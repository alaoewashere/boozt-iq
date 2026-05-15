/** Iraqi mobile: 11 digits starting with 07 (digits only). */
export function normalizeIqPhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function isValidIqPhoneDigits(digits: string): boolean {
  return /^07\d{9}$/.test(digits);
}
