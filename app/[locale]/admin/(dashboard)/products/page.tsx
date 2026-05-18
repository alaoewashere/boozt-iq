"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ProductImagePlaceholder } from "@/components/product/ProductImagePlaceholder";
import { Link } from "@/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { PageHeading } from "@/components/ui/PageHeading";

type Row = {
  id: string;
  name_en: string;
  categorySlug?: string;
  price: number;
  stock: number;
  isAvailable: boolean;
  imageUrl?: string;
};

export default function AdminProductsPage() {
  const t = useTranslations();
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products?page=1&limit=2000&admin=1", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load products");
      const data = (await res.json()) as {
        products: Record<string, unknown>[];
      };
      setRows(
        data.products.map((p) => ({
          id: String(p.id ?? ""),
          name_en: String(p.name_en ?? ""),
          categorySlug: p.categorySlug != null ? String(p.categorySlug) : undefined,
          price: Number(p.price ?? 0),
          stock: Number(p.stock ?? 0),
          isAvailable: p.isAvailable !== false,
          imageUrl: p.imageUrl != null ? String(p.imageUrl) : undefined,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const m =
        !search ||
        r.name_en.toLowerCase().includes(search.toLowerCase());
      const c = !cat || r.categorySlug === cat;
      return m && c;
    });
  }, [rows, search, cat]);

  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) void load();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <PageHeading size="compact" className="mb-0 min-w-0">
          {t("admin.products")}
        </PageHeading>
        <Link
          href="/admin/products/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[var(--text-primary)]"
        >
          {t("admin.addProduct")}
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-card px-3 py-2 text-sm"
        />
        <input
          placeholder="category slug"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-card px-3 py-2 text-sm"
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-card">
        {loading && (
          <p className="p-4 text-sm text-[var(--text-muted)]">
            {t("common.loading")}
          </p>
        )}
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-secondary/50">
            <tr>
              <th className="px-3 py-2">Image</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">{t("common.price")}</th>
              <th className="px-3 py-2">{t("common.stock")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-[var(--border)]">
                <td className="px-3 py-2">
                  <div className="relative h-12 w-12 overflow-hidden rounded bg-secondary">
                    {r.imageUrl?.trim() ? (
                      <Image
                        src={r.imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <ProductImagePlaceholder
                        name={r.name_en}
                        textClassName="text-lg"
                      />
                    )}
                  </div>
                </td>
                <td className="max-w-[320px] px-3 py-2 font-medium">
                  {r.name_en}
                </td>
                <td className="px-3 py-2">{r.categorySlug}</td>
                <td className="px-3 py-2">{r.price}</td>
                <td className="px-3 py-2">{r.stock}</td>
                <td className="px-3 py-2 text-end">
                  <Link
                    href={`/admin/products/${r.id}/edit`}
                    className="inline-flex p-2 text-accent"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => del(r.id)}
                    className="inline-flex p-2 text-error"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
