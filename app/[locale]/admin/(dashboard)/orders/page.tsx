"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, FileDown } from "lucide-react";
import { getAreaLabel } from "@/lib/checkout-areas";
import { getOrderStatusStyles } from "@/lib/order-status-styles";
import { cn } from "@/lib/utils";
import { PageHeading } from "@/components/ui/PageHeading";
import { getProductDisplayName } from "@/lib/product-name";

type OrderItem = {
  productId: string;
  name_en: string;
  price: number;
  quantity: number;
  imageUrl: string;
};

type OrderRow = {
  id: string;
  customerName: string;
  customerPhone: string;
  area?: string;
  customerAddress?: string;
  notes?: string;
  total: number;
  status: string;
  items: OrderItem[];
  createdAt?: number | null;
};

const STATUS_FILTERS = [
  "all",
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "preparing",
  "out for delivery",
  "processing",
] as const;

/** Primary workflow statuses for customer tracking (legacy values appended per row if needed). */
const STATUS_SELECT_BASE = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

function StatusBadge({ status }: { status: string }) {
  const st = getOrderStatusStyles(status);
  return (
    <span
      className={cn(
        "inline-flex max-w-[min(100%,14rem)] items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-200",
        st.pill
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", st.dot)}
        aria-hidden
      />
      <span className="min-w-0 truncate">{status}</span>
    </span>
  );
}

function toMillis(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (
    v &&
    typeof v === "object" &&
    "toMillis" in v &&
    typeof (v as { toMillis: () => number }).toMillis === "function"
  ) {
    return (v as { toMillis: () => number }).toMillis();
  }
  return 0;
}

export default function AdminOrdersPage() {
  const t = useTranslations();
  const tOrders = useTranslations("adminOrders");
  const locale = useLocale();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setLoading(true);
      try {
        const res = await fetch("/api/orders", { credentials: "same-origin" });
        if (!res.ok) {
          if (!cancelled) setOrders([]);
          return;
        }
        const data = (await res.json()) as {
          orders: Record<string, unknown>[];
        };
        if (cancelled) return;
        const list: OrderRow[] = data.orders.map((d) => ({
          id: String(d.id ?? ""),
          customerName: String(d.customerName ?? ""),
          customerPhone: String(d.customerPhone ?? ""),
          area: d.area != null ? String(d.area) : undefined,
          customerAddress:
            d.customerAddress != null ? String(d.customerAddress) : undefined,
          notes: d.notes != null ? String(d.notes) : undefined,
          total: Number(d.total ?? 0),
          status: String(d.status ?? "pending"),
          items: Array.isArray(d.items) ? (d.items as OrderItem[]) : [],
          createdAt:
            typeof d.createdAt === "number"
              ? d.createdAt
              : typeof d.createdAt === "string"
                ? new Date(d.createdAt).getTime()
                : undefined,
        }));
        setOrders(list);
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrders();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      tab === "all"
        ? orders
        : orders.filter((o) => o.status === tab),
    [orders, tab]
  );

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
  };

  const fmtDate = (o: OrderRow) => {
    const ms = toMillis(o.createdAt);
    if (!ms) return "—";
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-IQ" : "en-IQ", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ms));
  };

  const fmtIqd = (n: number) =>
    new Intl.NumberFormat(locale === "ar" ? "ar-IQ" : "en-IQ", {
      maximumFractionDigits: 0,
    }).format(Math.round(n));

  const areaLabel = (o: OrderRow) => {
    if (o.area) return getAreaLabel(o.area, locale);
    if (o.customerAddress) return o.customerAddress;
    return "—";
  };

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"}>
      <PageHeading size="compact" className="mb-6">
        {t("admin.orders")}
      </PageHeading>

      {loading && (
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          {t("common.loading")}
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => {
          const active = tab === s;
          const filterStyle = s !== "all" ? getOrderStatusStyles(s) : null;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setTab(s)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                active
                  ? s === "all"
                    ? "bg-accent text-[var(--text-primary)] shadow-sm"
                    : cn(filterStyle!.pill, "shadow-sm")
                  : "border border-[var(--border)] bg-card text-[var(--text-secondary)] hover:bg-secondary/80"
              )}
            >
              {s === "all" ? tOrders("filterAll") : s}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-card shadow-sm">
        <table className="w-full min-w-[1000px] text-start text-sm">
          <thead className="border-b border-[var(--border)] bg-secondary/50 text-[var(--text-muted)]">
            <tr>
              <th className="w-8 px-3 py-3" />
              <th className="px-3 py-3 font-medium">{tOrders("colId")}</th>
              <th className="px-3 py-3 font-medium">{tOrders("colCustomer")}</th>
              <th className="px-3 py-3 font-medium">{tOrders("colPhone")}</th>
              <th className="px-3 py-3 font-medium">{tOrders("colArea")}</th>
              <th className="px-3 py-3 font-medium">{tOrders("colTotal")}</th>
              <th className="px-3 py-3 font-medium">{tOrders("colStatus")}</th>
              <th className="px-3 py-3 font-medium">{tOrders("colDate")}</th>
              <th className="px-3 py-3 font-medium">{tOrders("colPdf")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <Fragment key={o.id}>
                <tr className="border-b border-[var(--border)] transition hover:bg-secondary/30">
                  <td className="px-3 py-3 align-top">
                    <button
                      type="button"
                      onClick={() =>
                        setOpen((x) => ({ ...x, [o.id]: !x[o.id] }))
                      }
                      className="rounded p-1 text-[var(--text-muted)] hover:bg-secondary hover:text-[var(--text-primary)]"
                      aria-expanded={open[o.id] ?? false}
                    >
                      {open[o.id] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-3 align-top font-mono text-xs text-[var(--text-secondary)]">
                    {o.id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-3 align-top font-medium">{o.customerName}</td>
                  <td className="px-3 py-3 align-top tabular-nums">{o.customerPhone}</td>
                  <td className="px-3 py-3 align-top text-[var(--text-secondary)]">
                    {areaLabel(o)}
                  </td>
                  <td className="px-3 py-3 align-top font-medium tabular-nums">
                    {fmtIqd(o.total)} IQD
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex flex-col gap-2">
                      <StatusBadge status={o.status} />
                      <select
                        value={o.status}
                        onChange={(e) => updateStatus(o.id, e.target.value)}
                        className={cn(
                          "max-w-[14rem] rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/35 focus:ring-offset-1 dark:focus:ring-offset-[var(--bg-secondary)]",
                          getOrderStatusStyles(o.status).select
                        )}
                        aria-label={tOrders("changeStatus")}
                      >
                        {(() => {
                          const opts: string[] = [...STATUS_SELECT_BASE];
                          if (!opts.includes(o.status)) opts.push(o.status);
                          return opts.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top text-[var(--text-muted)]">
                    {fmtDate(o)}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <a
                      href={`/api/admin/orders/${o.id}/pdf`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-card px-2.5 py-1.5 text-xs font-medium text-[var(--accent)] transition-colors hover:bg-secondary"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      {tOrders("downloadPdf")}
                    </a>
                  </td>
                </tr>
                {open[o.id] && (
                  <tr>
                    <td
                      colSpan={9}
                      className="border-b border-[var(--border)] bg-secondary/50 px-4 py-4 text-sm"
                    >
                      <div className="mx-auto max-w-3xl space-y-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                            {tOrders("items")}
                          </p>
                          <ul className="mt-2 space-y-2">
                            {o.items?.map((it) => (
                              <li
                                key={`${it.productId}-${it.name_en}`}
                                className="flex flex-wrap justify-between gap-2 border-b border-[var(--border)] border-dashed pb-2 last:border-0"
                              >
                                <span>
                                  {getProductDisplayName(locale, it)} ×{" "}
                                  {it.quantity}
                                </span>
                                <span className="tabular-nums font-medium">
                                  {fmtIqd(it.price * it.quantity)} IQD
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        {o.notes?.trim() && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                              {tOrders("notes")}
                            </p>
                            <p className="mt-1 text-[var(--text-secondary)]">
                              {o.notes}
                            </p>
                          </div>
                        )}
                        <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-card px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                          <span className="text-sm font-medium text-[var(--text-secondary)]">
                            {tOrders("colPdf")}
                          </span>
                          <a
                            href={`/api/admin/orders/${o.id}/pdf`}
                            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-secondary/50 px-4 py-2 text-sm font-semibold text-[var(--accent)] transition hover:bg-secondary"
                          >
                            <FileDown className="h-4 w-4" />
                            {tOrders("downloadPdf")}
                          </a>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                          {tOrders("changeStatusHint")}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length === 0 && (
        <p className="mt-6 text-center text-[var(--text-muted)]">
          {tOrders("empty")}
        </p>
      )}
    </div>
  );
}
