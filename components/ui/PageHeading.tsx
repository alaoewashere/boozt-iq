"use client";

import { cn } from "@/lib/utils";

export type PageHeadingProps = {
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  description?: React.ReactNode;
  size?: "default" | "compact";
  align?: "start" | "center";
  as?: "h1" | "h2";
};

export function PageHeading({
  children,
  className,
  titleClassName,
  description,
  size = "default",
  align = "start",
  as: Tag = "h1",
}: PageHeadingProps) {
  const titleSize =
    size === "compact"
      ? "text-[1.8rem] sm:text-[2rem]"
      : "text-[2.2rem] sm:text-[2.5rem]";

  return (
    <header
      className={cn(
        "relative",
        align === "center" && "text-center",
        className
      )}
    >
      <Tag
        className={cn(
          titleSize,
          "font-heading font-light text-[var(--text-primary)] antialiased",
          titleClassName
        )}
      >
        {children}
      </Tag>

      {align === "center" ? (
        <div className="mt-4 flex justify-center" aria-hidden>
          <span className="h-[2px] w-10 bg-[var(--accent)]" />
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-0" aria-hidden>
          <span className="h-[2px] w-10 bg-[var(--accent)]" />
          <span className="h-px max-w-[4rem] min-w-0 flex-1 bg-gradient-to-r from-[rgba(154,0,2,0.18)] to-transparent rtl:bg-gradient-to-l" />
        </div>
      )}

      {description ? (
        <p
          className={cn(
            "mt-4 max-w-2xl font-body text-sm font-light leading-relaxed text-[#9A7F7A]",
            align === "center" && "mx-auto"
          )}
        >
          {description}
        </p>
      ) : null}
    </header>
  );
}
