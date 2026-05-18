import type { OrderPdfInput } from "@/lib/order-pdf";

/**
 * Map an order document to pdfmake input (admin + API routes).
 */
export function orderDocToPdfInput(
  id: string,
  data: Record<string, unknown>
): OrderPdfInput {
  const items =
    (data.items as Array<{
      name_en: string;
      name_ar?: string;
      quantity: number;
      price: number;
    }>) ?? [];

  const createdAtRaw = data.createdAt;
  let createdAt: Date;
  if (typeof createdAtRaw === "number") {
    createdAt = new Date(createdAtRaw);
  } else if (
    createdAtRaw &&
    typeof createdAtRaw === "object" &&
    "toDate" in createdAtRaw &&
    typeof (createdAtRaw as { toDate: () => Date }).toDate === "function"
  ) {
    createdAt = (createdAtRaw as { toDate: () => Date }).toDate();
  } else {
    createdAt = new Date();
  }

  return {
    id,
    customerName: String(data.customerName ?? ""),
    customerPhone: String(data.customerPhone ?? ""),
    area: data.area != null ? String(data.area) : undefined,
    customerAddress:
      data.customerAddress != null ? String(data.customerAddress) : undefined,
    notes: data.notes != null ? String(data.notes) : "",
    items: items.map((i) => ({
      name_en: i.name_en?.trim() || i.name_ar?.trim() || "—",
      quantity: i.quantity,
      price: i.price,
    })),
    total: Number(data.total ?? 0),
    status: String(data.status ?? "pending"),
    createdAt,
  };
}
