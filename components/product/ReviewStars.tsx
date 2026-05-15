"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Display-only row of 1–5 stars (uses rounded average for fill). */
export function ReviewStarsDisplay({
  rating,
  max = 5,
  size = "md",
}: {
  rating: number;
  max?: number;
  size?: "sm" | "md" | "lg";
}) {
  const rounded = Math.min(max, Math.max(0, Math.round(rating)));
  const dim =
    size === "lg" ? "h-7 w-7" : size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${rating} out of ${max}`}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <Star
          key={n}
          className={cn(
            dim,
            n <= rounded
              ? "fill-amber-400 text-amber-400"
              : "text-[var(--text-muted)]"
          )}
          strokeWidth={n <= rounded ? 0 : 1.5}
        />
      ))}
    </div>
  );
}

/** Clickable 1–5 star input for forms. */
export function ReviewStarsInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className={cn(
            "rounded p-0.5 transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
            disabled && "pointer-events-none opacity-50"
          )}
          aria-pressed={value === n}
          aria-label={`${n} stars`}
        >
          <Star
            className={cn(
              "h-8 w-8 sm:h-9 sm:w-9",
              n <= value
                ? "fill-amber-400 text-amber-400"
                : "text-[var(--text-muted)]"
            )}
            strokeWidth={n <= value ? 0 : 1.5}
          />
        </button>
      ))}
    </div>
  );
}
