"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import type { ReviewSerialized } from "@/lib/types";
import { ReviewStarsDisplay, ReviewStarsInput } from "./ReviewStars";
import { Loader2 } from "lucide-react";

export function ProductReviewsSection({
  productId,
  locale,
  initialReviews,
}: {
  productId: string;
  locale: string;
  initialReviews: ReviewSerialized[];
}) {
  const t = useTranslations("reviews");
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewSerialized[]>(initialReviews);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    setReviews(initialReviews);
  }, [initialReviews]);

  const { average, count } = useMemo(() => {
    if (reviews.length === 0) return { average: 0, count: 0 };
    const sum = reviews.reduce((s, r) => s + r.rating, 0);
    return { average: sum / reviews.length, count: reviews.length };
  }, [reviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedName = name.trim();
    const trimmedComment = comment.trim();
    if (!trimmedName || !trimmedComment) {
      setError(t("formErrorRequired"));
      return;
    }
    if (rating < 1 || rating > 5) {
      setError(t("formErrorRating"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          reviewerName: trimmedName,
          rating,
          comment: trimmedComment,
          locale,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof j.error === "string" ? j.error : "Request failed");
      }
      setThanks(true);
      setShowForm(false);
      setName("");
      setComment("");
      setRating(5);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(t("formErrorSubmit"));
    } finally {
      setSubmitting(false);
    }
  };

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-IQ" : "en-IQ", {
        dateStyle: "medium",
      }),
    [locale]
  );

  return (
    <section className="mt-14 border-t border-[var(--border)] pt-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {t("title")}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ReviewStarsDisplay rating={average} size="lg" />
            <span className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">
              {count === 0 ? "—" : average.toFixed(1)}
            </span>
            <span className="text-sm text-[var(--text-muted)]">
              {t("count", { count })}
            </span>
          </div>
        </div>
        {!thanks && (
          <button
            type="button"
            onClick={() => {
              setShowForm((v) => !v);
              setError("");
            }}
            className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)]/50 hover:bg-[var(--bg-secondary)]"
          >
            {t("writeReview")}
          </button>
        )}
      </div>

      {thanks && (
        <div className="mb-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-800 dark:text-emerald-200">
          {t("thankYou")}
        </div>
      )}

      {showForm && !thanks && (
        <form
          onSubmit={handleSubmit}
          className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm"
        >
          <p className="mb-4 text-sm font-medium text-[var(--text-secondary)]">
            {t("yourRating")}
          </p>
          <ReviewStarsInput value={rating} onChange={setRating} disabled={submitting} />
          <label className="mt-6 block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              {t("nameLabel")}
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              autoComplete="name"
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              {t("commentLabel")}
            </span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              rows={4}
              maxLength={2000}
              className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </label>
          {error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("submit")}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      {reviews.length === 0 && !showForm && !thanks && (
        <p className="text-[var(--text-muted)]">{t("noneYet")}</p>
      )}
      {reviews.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-[var(--text-primary)]">
                  {r.reviewerName}
                </p>
                <time
                  className="shrink-0 text-xs text-[var(--text-muted)]"
                  dateTime={new Date(r.createdAt).toISOString()}
                >
                  {dateFmt.format(new Date(r.createdAt))}
                </time>
              </div>
              <div className="mt-2">
                <ReviewStarsDisplay rating={r.rating} size="sm" />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
                {r.comment}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
