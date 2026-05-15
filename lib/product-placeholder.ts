/** Deterministic HSL background from a string (e.g. product name). */
export function placeholderHueFromString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 360;
}

export function placeholderBackgroundCss(name: string): string {
  const hue = placeholderHueFromString(name);
  return `hsl(${hue} 42% 38%)`;
}

/** First character for avatar-style placeholders (handles multi-codepoint strings). */
export function firstLetterFromName(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  const chars = Array.from(t);
  const ch = chars[0];
  if (!ch) return "?";
  return ch.length === 1 && /[a-z]/i.test(ch) ? ch.toUpperCase() : ch;
}
