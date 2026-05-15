"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PageHeading } from "@/components/ui/PageHeading";

type Cat = {
  category: {
    id: string;
    name_en: string;
    name_ar: string;
    slug: string;
    icon: string;
  };
  subcategories: {
    id: string;
    name_en: string;
    name_ar: string;
    slug: string;
  }[];
};

export default function AdminCategoriesPage() {
  const t = useTranslations();
  const [data, setData] = useState<Cat[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const load = () =>
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setData(d.categories ?? []));

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeading size="compact" className="mb-6">
        {t("admin.categories")}
      </PageHeading>
      <div className="space-y-2">
        {data.map(({ category, subcategories }) => (
          <div
            key={category.id}
            className="rounded-xl border border-[var(--border)] bg-card"
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-3 text-start"
              onClick={() =>
                setOpen((o) => ({ ...o, [category.id]: !o[category.id] }))
              }
            >
              {open[category.id] ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="text-lg">{category.icon}</span>
              <span className="font-medium">{category.name_en}</span>
              <span className="text-[var(--text-muted)]">/{category.slug}</span>
            </button>
            {open[category.id] && (
              <ul className="border-t border-[var(--border)] px-3 py-2">
                {subcategories.map((s) => (
                  <li
                    key={s.id}
                    className="flex justify-between py-1 text-sm text-[var(--text-secondary)]"
                  >
                    <span>{s.name_en}</span>
                    <span className="text-[var(--text-muted)]">{s.slug}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-[var(--text-muted)]">
        Seed categories via <code className="rounded bg-secondary px-1">npm run seed</code>
        . Manage subcategories in Supabase Dashboard or extend API.
      </p>
    </div>
  );
}
