"use client";

import { useTranslations } from "next-intl";
import { Instagram, MessageCircle } from "lucide-react";
import { Link } from "@/navigation";
import { cn } from "@/lib/utils";

const categoryLinks = [
  { slug: "hookah", key: "hookah" as const },
  { slug: "vape", key: "vape" as const },
  { slug: "pods", key: "pods" as const },
  { slug: "boardgames", key: "boardgames" as const },
  { slug: "nicotine", key: "nicotine" as const },
  { slug: "cigarettes", key: "cigarettes" as const },
];

export function Footer({ className }: { className?: string }) {
  const t = useTranslations();

  return (
    <footer
      className={cn(
        "relative border-t border-[rgba(154,0,2,0.12)] bg-[#080304] pb-28 pt-14 md:pb-14",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-20"
        style={{
          background:
            "linear-gradient(to bottom, rgba(154,0,2,0.04), transparent)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-[1280px] gap-10 px-6 md:grid-cols-3">
        <div>
          <div className="mb-3 flex items-baseline gap-0 font-heading text-[1.75rem] uppercase tracking-[0.08em] text-[#EFE6DE]">
            <span>boozt</span>
            <span className="text-[#9A0002]">.</span>
            <span>iq</span>
          </div>
          <p className="max-w-[280px] font-body text-[0.85rem] font-light italic text-[#4D3030]">
            {t("hero.subtitle")}
          </p>
        </div>

        <div>
          <h3 className="mb-4 font-body text-[0.7rem] font-medium uppercase tracking-[0.2em] text-[#9A7F7A]">
            {t("nav.categories")}
          </h3>
          <ul className="flex flex-col gap-2.5">
            {categoryLinks.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/products?category=${encodeURIComponent(c.slug)}`}
                  className="font-body text-[0.85rem] font-light text-[#9A7F7A] transition-colors duration-300 hover:text-[#9A0002]"
                >
                  {t(`categories.${c.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-body text-[0.7rem] font-medium uppercase tracking-[0.2em] text-[#9A7F7A]">
            Social
          </h3>
          <div className="flex gap-3">
            <a
              href="https://www.instagram.com/boozt.smoke/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(154,0,2,0.25)] text-[#9A7F7A] transition-all duration-300 hover:border-[#9A0002] hover:text-[#9A0002] hover:shadow-[0_0_22px_rgba(154,0,2,0.22)]"
              aria-label="Instagram"
            >
              <Instagram className="h-4 w-4" strokeWidth={1.5} />
            </a>
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(154,0,2,0.25)] text-[#9A7F7A] transition-all duration-300 hover:border-[#9A0002] hover:text-[#9A0002] hover:shadow-[0_0_22px_rgba(154,0,2,0.22)]"
              aria-label="WhatsApp"
            >
              <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
            </a>
          </div>
        </div>
      </div>

      <p className="mt-12 text-center font-body text-[0.72rem] font-light text-[#4D3030]">
        © {new Date().getFullYear()} boozt.iq
      </p>
    </footer>
  );
}
