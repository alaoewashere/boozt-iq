"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  Package,
  TrendingUp,
} from "lucide-react";
import { Link } from "@/navigation";

type Props = {
  avgOrderIqd: number;
  fulfillmentPct: number;
  pipelinePct: number;
  pipelineCount: number;
  topStatuses: { status: string; count: number; pct: number }[];
  totalOrdersCount: number;
  labels: {
    title: string;
    subtitle: string;
    avgOrder: string;
    fulfillment: string;
    pipeline: string;
    pipelineShare: string;
    byStatus: string;
    sample: string;
    viewOrders: string;
    ordersTotal: string;
  };
  locale: string;
};

function fmtIqd(n: number, locale: string) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-IQ" : "en-IQ", {
    maximumFractionDigits: 0,
  }).format(n);
}

export function AdminAnalyticsCard({
  avgOrderIqd,
  fulfillmentPct,
  pipelinePct,
  pipelineCount,
  topStatuses,
  totalOrdersCount,
  labels,
  locale,
}: Props) {
  return (
    <section className="relative mt-10 overflow-hidden rounded-2xl border border-[var(--border)] bg-card shadow-sm">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_100%_-10%,rgba(200,169,110,0.14),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_0%_100%,rgba(200,169,110,0.08),transparent_50%)]"
        aria-hidden
      />

      <div className="relative border-b border-[var(--border)] px-5 py-5 md:flex md:items-start md:justify-between md:px-8 md:py-6">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-[var(--accent)]/25">
            <BarChart3 className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] md:text-xl">
                {labels.title}
              </h2>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Admin
              </span>
            </div>
            <p className="mt-1 max-w-xl text-sm text-[var(--text-secondary)]">
              {labels.subtitle}
            </p>
          </div>
        </div>
        <Link
          href="/admin/orders"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] transition hover:gap-2 md:mt-0"
        >
          {labels.viewOrders}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Link>
      </div>

      <div className="relative grid gap-6 p-5 md:grid-cols-12 md:gap-8 md:p-8">
        <div className="md:col-span-5">
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1 md:gap-4">
            <MetricTile
              icon={<TrendingUp className="h-4 w-4" />}
              label={labels.avgOrder}
              value={`${fmtIqd(avgOrderIqd, locale)} IQD`}
              hint={`${labels.ordersTotal}: ${totalOrdersCount.toLocaleString(locale === "ar" ? "ar-IQ" : "en-IQ")}`}
            />
            <MetricTile
              icon={<Activity className="h-4 w-4" />}
              label={labels.fulfillment}
              value={`${fulfillmentPct}%`}
              bar={fulfillmentPct}
              barVariant="success"
            />
            <MetricTile
              icon={<Package className="h-4 w-4" />}
              label={labels.pipeline}
              value={String(pipelineCount)}
              hint={labels.pipelineShare}
              bar={pipelinePct}
              barVariant="accent"
            />
          </div>
        </div>

        <div className="md:col-span-7">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {labels.byStatus}
          </p>
          <ul className="space-y-3">
            {topStatuses.map((row) => (
              <li key={row.status}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-medium text-[var(--text-primary)]">
                    {row.status}
                  </span>
                  <span className="shrink-0 tabular-nums text-xs text-[var(--text-muted)]">
                    {row.count}{" "}
                    <span className="text-[var(--text-secondary)]">
                      ({row.pct}%)
                    </span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary ring-1 ring-[var(--border)]/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--accent)]/90 to-[var(--accent)]/45 transition-all duration-500"
                    style={{ width: `${Math.max(row.pct, 3)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-[var(--text-muted)]">
            {labels.sample}
          </p>
        </div>
      </div>
    </section>
  );
}

function MetricTile({
  icon,
  label,
  value,
  hint,
  bar,
  barVariant,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  bar?: number;
  barVariant?: "success" | "accent";
}) {
  return (
    <div className="group rounded-xl border border-[var(--border)] bg-secondary/40 p-4 transition hover:border-[var(--accent)]/35 hover:bg-secondary/60">
      <div className="text-[var(--accent)] opacity-90">{icon}</div>
      <p className="mt-3 text-xl font-bold tabular-nums tracking-tight text-[var(--text-primary)] md:text-2xl">
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </p>
      {hint && (
        <p className="mt-2 text-[11px] leading-snug text-[var(--text-muted)]">
          {hint}
        </p>
      )}
      {bar != null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className={
              barVariant === "success"
                ? "h-full rounded-full bg-[var(--success)]"
                : "h-full rounded-full bg-[var(--accent)]/85"
            }
            style={{ width: `${Math.min(bar, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
