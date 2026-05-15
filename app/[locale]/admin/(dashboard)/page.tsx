import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import { getAdminDashboardSnapshot } from "@/lib/server-data-orders";
import { computeOrderAnalytics } from "@/lib/admin-order-analytics";
import { AdminAnalyticsCard } from "@/components/admin/AdminAnalyticsCard";
import { Package, ShoppingBag, Clock, Coins, MessageSquareQuote } from "lucide-react";
import { PageHeading } from "@/components/ui/PageHeading";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const t = await getTranslations("admin");
  const locale = await getLocale();

  const {
    totalProducts,
    totalOrders,
    pendingOrders,
    pendingReviewsCount,
    orderRows,
    recent,
  } = await getAdminDashboardSnapshot();

  const countsTowardRevenue = new Set([
    "delivered",
    "confirmed",
    "preparing",
    "out for delivery",
    "processing",
    "shipped",
  ]);
  let revenue = 0;
  for (const r of orderRows) {
    if (countsTowardRevenue.has(r.status)) {
      revenue += r.total;
    }
  }

  const analytics = computeOrderAnalytics(orderRows);

  return (
    <div>
      <PageHeading size="compact" className="mb-8">
        {t("dashboard")}
      </PageHeading>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          icon={<Package className="h-5 w-5" />}
          label={t("totalProducts")}
          value={String(totalProducts)}
        />
        <StatCard
          icon={<ShoppingBag className="h-5 w-5" />}
          label={t("totalOrders")}
          value={String(totalOrders)}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label={t("pendingOrders")}
          value={String(pendingOrders)}
        />
        <StatCard
          icon={<Coins className="h-5 w-5" />}
          label={t("revenue")}
          value={`${revenue.toLocaleString()} IQD`}
        />
        <Link
          href="/admin/reviews"
          className="relative block rounded-xl border border-[var(--border)] bg-card p-4 shadow-sm transition hover:border-[var(--accent)]/40"
        >
          <div className="flex items-center gap-3 text-accent">
            <MessageSquareQuote className="h-5 w-5" />
            {pendingReviewsCount > 0 && (
              <span className="absolute end-3 top-3 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {pendingReviewsCount > 99 ? "99+" : pendingReviewsCount}
              </span>
            )}
          </div>
          <p className="mt-2 text-2xl font-bold">{pendingReviewsCount}</p>
          <p className="text-sm text-[var(--text-secondary)]">
            {t("pendingReviews")}
          </p>
        </Link>
      </div>

      {analytics && totalOrders > 0 && (
        <AdminAnalyticsCard
          avgOrderIqd={analytics.avgOrderIqd}
          fulfillmentPct={analytics.fulfillmentPct}
          pipelinePct={analytics.pipelinePct}
          pipelineCount={analytics.pipelineCount}
          topStatuses={analytics.topStatuses}
          totalOrdersCount={totalOrders}
          locale={locale}
          labels={{
            title: t("analyticsTitle"),
            subtitle: t("analyticsSubtitle"),
            avgOrder: t("analyticsAvgOrder"),
            fulfillment: t("analyticsFulfillment"),
            pipeline: t("analyticsPipeline"),
            pipelineShare: t("analyticsPipelineShare", {
              pct: analytics.pipelinePct,
            }),
            byStatus: t("analyticsByStatus"),
            sample: t("analyticsSample", { count: analytics.sampleSize }),
            viewOrders: t("analyticsViewOrders"),
            ordersTotal: t("analyticsOrdersTotal"),
          }}
        />
      )}

      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/admin/products/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-accent-hover"
        >
          {t("addProduct")}
        </Link>
        <Link
          href="/admin/orders"
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-card"
        >
          {t("orders")}
        </Link>
      </div>

      <div className="mt-10 overflow-hidden rounded-xl border border-[var(--border)] bg-card">
        <h2 className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">
          {t("recentOrders")}
        </h2>
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/50 text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-2">{t("recentCustomer")}</th>
              <th className="px-4 py-2">{t("recentTotal")}</th>
              <th className="px-4 py-2">{t("recentStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((o) => (
              <tr key={o.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-2">{o.customerName}</td>
                <td className="px-4 py-2">{o.total}</td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3 text-accent">{icon}</div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
    </div>
  );
}
