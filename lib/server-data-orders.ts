import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { serializeRecord } from "./serialize";
import {
  CACHE_TAG_ORDERS,
  CACHE_TAG_PRODUCTS,
  CACHE_TAG_REVIEWS,
  PRODUCT_CACHE_REVALIDATE,
} from "./server-data";

export type AdminRecentOrderRow = {
  id: string;
  customerName: string;
  total: number;
  status: string;
};

function mapOrderRow(r: Record<string, unknown>): Record<string, unknown> & {
  id: string;
} {
  const id = String(r.id ?? "");
  const created = r.created_at;
  const updated = r.updated_at;
  const pdfAt = r.pdf_generated_at;
  return serializeRecord(id, {
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    area: r.area,
    notes: r.notes,
    items: r.items,
    total: r.total,
    status: r.status,
    pdfUrl: r.pdf_url,
    pdfPath: r.pdf_path,
    pdfGeneratedAt: pdfAt,
    createdAt:
      typeof created === "string"
        ? new Date(created).getTime()
        : typeof created === "number"
          ? created
          : Date.now(),
    updatedAt:
      typeof updated === "string"
        ? new Date(updated).getTime()
        : typeof updated === "number"
          ? updated
          : Date.now(),
  });
}

async function fetchPendingReviewsCountForDashboard(): Promise<number> {
  const supa = getSupabaseAdmin();
  const { count, error } = await supa
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("approved", false);
  if (error) throw error;
  return count ?? 0;
}

async function fetchAdminDashboardUncached() {
  const supa = getSupabaseAdmin();
  const [
    { count: productsCount, error: e1 },
    { data: ordersRows, error: e2 },
    { count: pendingCount, error: e3 },
    pendingReviewsCount,
    { count: totalOrdersCount, error: e4 },
  ] = await Promise.all([
    supa.from("products").select("*", { count: "exact", head: true }),
    supa.from("orders").select("*").order("created_at", { ascending: false }).limit(1000),
    supa
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    fetchPendingReviewsCountForDashboard(),
    supa.from("orders").select("*", { count: "exact", head: true }),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;
  if (e4) throw e4;

  const totalProducts = productsCount ?? 0;
  const totalOrders = totalOrdersCount ?? 0;
  const pendingOrders = pendingCount ?? 0;

  const orderRows = (ordersRows ?? []).map((d) => {
    const x = d as { total?: unknown; status?: unknown };
    return {
      total: Number(x.total ?? 0),
      status: String(x.status ?? "pending"),
    };
  });

  const recent: AdminRecentOrderRow[] = (ordersRows ?? []).slice(0, 10).map((d) => {
    const x = mapOrderRow(d as Record<string, unknown>);
    return {
      id: x.id,
      customerName: String(x.customerName ?? ""),
      total: Number(x.total ?? 0),
      status: String(x.status ?? "pending"),
    };
  });

  return {
    totalProducts,
    totalOrders,
    pendingOrders,
    pendingReviewsCount,
    orderRows,
    recent,
  };
}

const adminDashboardSnapshotCached = unstable_cache(
  fetchAdminDashboardUncached,
  ["admin-dashboard-snapshot"],
  {
    revalidate: PRODUCT_CACHE_REVALIDATE,
    tags: [CACHE_TAG_ORDERS, CACHE_TAG_PRODUCTS, CACHE_TAG_REVIEWS],
  }
);

const getAdminDashboardSnapshotInner = cache(() =>
  adminDashboardSnapshotCached()
);

export async function getAdminDashboardSnapshot() {
  return getAdminDashboardSnapshotInner();
}

async function fetchOrdersListAdminUncached() {
  const supa = getSupabaseAdmin();
  const { data, error } = await supa
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((d) => mapOrderRow(d as Record<string, unknown>));
}

const ordersListAdminCached = unstable_cache(
  fetchOrdersListAdminUncached,
  ["admin-orders-list-500"],
  {
    revalidate: PRODUCT_CACHE_REVALIDATE,
    tags: [CACHE_TAG_ORDERS],
  }
);

const getOrdersListForAdminInner = cache(() => ordersListAdminCached());

export async function getOrdersListForAdmin() {
  return getOrdersListForAdminInner();
}

async function fetchOrderByIdUncached(orderId: string) {
  const supa = getSupabaseAdmin();
  const { data, error } = await supa
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) return null;
  return mapOrderRow(data as Record<string, unknown>);
}

export const getOrderByIdCached = cache(async (orderId: string) =>
  unstable_cache(
    async () => fetchOrderByIdUncached(orderId),
    ["order-doc", orderId],
    {
      revalidate: PRODUCT_CACHE_REVALIDATE,
      tags: [CACHE_TAG_ORDERS, `order:${orderId}`],
    }
  )()
);
