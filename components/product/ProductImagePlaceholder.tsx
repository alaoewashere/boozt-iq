"use client";

import { firstLetterFromName } from "@/lib/product-placeholder";
import { cn } from "@/lib/utils";

export function ProductImagePlaceholder({
  name,
  className,
  textClassName,
}: {
  name: string;
  className?: string;
  textClassName?: string;
}) {
  const letter = firstLetterFromName(name);

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-[#110608]",
        className
      )}
      aria-hidden
    >
      <span
        className={cn(
          "select-none font-heading font-light text-[var(--accent)] opacity-30",
          textClassName ?? "text-4xl md:text-5xl"
        )}
      >
        {letter}
      </span>
    </div>
  );
}
