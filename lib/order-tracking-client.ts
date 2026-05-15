export type ChatTurn = { role: "user" | "assistant"; content: string };

export type OrderItemLine = {
  name_en: string;
  name_ar: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type TrackedOrder = {
  orderNumber: string;
  status: string;
  items: OrderItemLine[];
  totalPrice: number;
  createdAt: string | null;
  customerName: string;
  deliveryAddress: string;
};

export type OrderTrackingResponse = {
  found?: boolean;
  order?: TrackedOrder | null;
  reply?: string;
  error?: string;
};

/** Same POST as the Track Order button / floating widget. */
export async function fetchOrderTracking(args: {
  orderNumber: string;
  history: ChatTurn[];
  locale: "en" | "ar";
}): Promise<{ ok: boolean; data: OrderTrackingResponse }> {
  const res = await fetch("/api/order-tracking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderNumber: args.orderNumber.trim(),
      conversationHistory: args.history.slice(-5),
      locale: args.locale,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as OrderTrackingResponse;
  return { ok: res.ok, data };
}
