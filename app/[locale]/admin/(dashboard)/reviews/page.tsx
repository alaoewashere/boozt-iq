"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { ReviewStarsDisplay } from "@/components/product/ReviewStars";
import { Loader2, Trash2, Check } from "lucide-react";
import { PageHeading } from "@/components/ui/PageHeading";

type Row = {
  id: string;
  productId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  locale: string;
  createdAt: number;
};

export default function AdminReviewsPage() {
  const t = useTranslations();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/reviews", {
          credentials: "same-origin",
        });
        if (!res.ok) {
          if (!cancelled) setRows([]);
          return;
        }
        const data = (await res.json()) as { reviews: Row[] };
        if (!cancelled) setRows(data.reviews ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
      });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t("admin.reviewDeleteConfirm"))) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeading
        size="compact"
        className="mb-6"
        description={t("admin.reviewsHint")}
      >
        {t("admin.reviews")}
      </PageHeading>

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Loader2 className="h-5 w-5 animate-spin" />
          {t("common.loading")}
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-[var(--border)] bg-card p-8 text-center text-[var(--text-muted)]">
          {t("admin.reviewsEmpty")}
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-[var(--border)] bg-card p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {r.reviewerName}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {r.locale} ·{" "}
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2">
                    <ReviewStarsDisplay rating={r.rating} size="sm" />
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {r.comment}
                  </p>
                  <p className="mt-2 text-xs">
                    <span className="text-[var(--text-muted)]">Product: </span>
                    <Link
                      href={`/product/${r.productId}`}
                      className="text-[var(--accent)] hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {r.productId}
                    </Link>
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => approve(r.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-medium text-white hover:opacity-95 disabled:opacity-50"
                  >
                    {busyId === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    {t("admin.reviewApprove")}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => remove(r.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
