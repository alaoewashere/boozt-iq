/**
 * Visual styles for order statuses (admin UI).
 * Soft backgrounds + darker text; works in light and dark mode.
 */

export type OrderStatusVisual = {
  /** Colored dot (before label) */
  dot: string;
  /** Full pill/badge classes */
  pill: string;
  /** <select> appearance for the current value */
  select: string;
};

const FALLBACK: OrderStatusVisual = {
  dot: "bg-zinc-500 dark:bg-zinc-400",
  pill:
    "border border-zinc-200/90 bg-zinc-100 text-zinc-800 dark:border-zinc-600/80 dark:bg-zinc-800/90 dark:text-zinc-100",
  select:
    "border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-100",
};

/** Primary + legacy status values */
export const ORDER_STATUS_STYLES: Record<string, OrderStatusVisual> = {
  pending: {
    dot: "bg-zinc-500 dark:bg-zinc-400",
    pill:
      "border border-zinc-200/90 bg-zinc-100 text-zinc-800 dark:border-zinc-600/80 dark:bg-zinc-800/90 dark:text-zinc-100",
    select:
      "border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-100",
  },
  confirmed: {
    dot: "bg-blue-600 dark:bg-blue-400",
    pill:
      "border border-blue-200/90 bg-blue-50 text-blue-900 dark:border-blue-700/60 dark:bg-blue-950/70 dark:text-blue-100",
    select:
      "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-100",
  },
  preparing: {
    dot: "bg-orange-500 dark:bg-orange-400",
    pill:
      "border border-orange-200/90 bg-orange-50 text-orange-900 dark:border-orange-800/50 dark:bg-orange-950/45 dark:text-orange-100",
    select:
      "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800/50 dark:bg-orange-950/35 dark:text-orange-100",
  },
  "out for delivery": {
    dot: "bg-violet-600 dark:bg-violet-400",
    pill:
      "border border-violet-200/90 bg-violet-50 text-violet-900 dark:border-violet-800/50 dark:bg-violet-950/50 dark:text-violet-100",
    select:
      "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800/50 dark:bg-violet-950/40 dark:text-violet-100",
  },
  delivered: {
    dot: "bg-emerald-600 dark:bg-emerald-400",
    pill:
      "border border-emerald-200/90 bg-emerald-50 text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/45 dark:text-emerald-100",
    select:
      "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-100",
  },
  cancelled: {
    dot: "bg-red-600 dark:bg-red-400",
    pill:
      "border border-red-200/90 bg-red-50 text-red-900 dark:border-red-800/50 dark:bg-red-950/45 dark:text-red-100",
    select:
      "border-red-200 bg-red-50 text-red-900 dark:border-red-800/50 dark:bg-red-950/35 dark:text-red-100",
  },
  /** Legacy */
  processing: {
    dot: "bg-indigo-600 dark:bg-indigo-400",
    pill:
      "border border-indigo-200/90 bg-indigo-50 text-indigo-900 dark:border-indigo-800/50 dark:bg-indigo-950/50 dark:text-indigo-100",
    select:
      "border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-800/50 dark:bg-indigo-950/40 dark:text-indigo-100",
  },
  shipped: {
    dot: "bg-orange-500 dark:bg-orange-400",
    pill:
      "border border-orange-200/90 bg-orange-50 text-orange-900 dark:border-orange-800/50 dark:bg-orange-950/45 dark:text-orange-100",
    select:
      "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800/50 dark:bg-orange-950/35 dark:text-orange-100",
  },
};

export function getOrderStatusStyles(status: string): OrderStatusVisual {
  return ORDER_STATUS_STYLES[status] ?? FALLBACK;
}
