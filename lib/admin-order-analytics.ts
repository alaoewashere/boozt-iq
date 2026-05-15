/**
 * Aggregates metrics from a sample of order documents (admin dashboard).
 */

export type OrderRowForAnalytics = {
  total: number;
  status: string;
};

export type OrderAnalyticsResult = {
  avgOrderIqd: number;
  fulfillmentPct: number;
  pipelinePct: number;
  pipelineCount: number;
  topStatuses: { status: string; count: number; pct: number }[];
  sampleSize: number;
};

const PIPELINE_STATUSES = new Set([
  "pending",
  "confirmed",
  "preparing",
  "out for delivery",
  "processing",
  "shipped",
]);

export function computeOrderAnalytics(
  rows: OrderRowForAnalytics[]
): OrderAnalyticsResult | null {
  const n = rows.length;
  if (n === 0) return null;

  const statusCounts = new Map<string, number>();
  let sumTotal = 0;
  let delivered = 0;
  let pipeline = 0;

  for (const r of rows) {
    sumTotal += Number(r.total ?? 0);
    const s = (r.status ?? "pending").trim() || "pending";
    statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
    if (s === "delivered") delivered += 1;
    if (PIPELINE_STATUSES.has(s)) pipeline += 1;
  }

  const avgOrderIqd = Math.round(sumTotal / n);
  const fulfillmentPct = Math.min(100, Math.round((delivered / n) * 100));
  const pipelinePct = Math.min(100, Math.round((pipeline / n) * 100));

  const topStatuses = [...statusCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([status, count]) => ({
      status,
      count,
      pct: Math.round((count / n) * 100),
    }));

  return {
    avgOrderIqd,
    fulfillmentPct,
    pipelinePct,
    pipelineCount: pipeline,
    topStatuses,
    sampleSize: n,
  };
}
