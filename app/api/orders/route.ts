import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CACHE_TAG_ORDERS } from "@/lib/server-data";
import { getOrdersListForAdmin } from "@/lib/server-data-orders";
import { verifyAdmin } from "@/lib/verify-admin";
import { CHECKOUT_CITY } from "@/lib/checkout-areas";
import { buildOrderPdfBuffer } from "@/lib/order-pdf";
import { uploadOrderPdf } from "@/lib/order-pdf-upload";

export const dynamic = "force-dynamic";

const orderItemSchema = z.object({
  productId: z.string(),
  name_en: z.string(),
  name_ar: z.string(),
  price: z.number(),
  quantity: z.number().int().positive(),
  imageUrl: z.string(),
});

const areaSchema = z
  .string()
  .transform((v) => (v === "baghdad" || v === CHECKOUT_CITY ? CHECKOUT_CITY : v))
  .pipe(z.literal(CHECKOUT_CITY));

const iqPhoneSchema = z
  .string()
  .transform((s) => s.replace(/\D/g, ""))
  .pipe(z.string().regex(/^07\d{9}$/, "Phone must be 11 digits starting with 07"));

const createOrderSchema = z.object({
  customerName: z.string().trim().min(2),
  customerPhone: iqPhoneSchema,
  area: areaSchema,
  notes: z.string().trim().min(1, "Address is required"),
  items: z.array(orderItemSchema).min(1),
  total: z.number().positive(),
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = createOrderSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { customerName, customerPhone, area, notes, items, total } =
    parsed.data;
  const nowIso = new Date().toISOString();

  const supa = getSupabaseAdmin();
  const { data: inserted, error } = await supa
    .from("orders")
    .insert({
      customer_name: customerName,
      customer_phone: customerPhone,
      area,
      notes: notes ?? "",
      items,
      total,
      status: "pending",
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select("id")
    .single();

  if (error || !inserted?.id) {
    console.error("[orders POST]", error);
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  const orderId = String(inserted.id);

  try {
    const pdfBuffer = await buildOrderPdfBuffer({
      id: orderId,
      customerName,
      customerPhone,
      area,
      notes: notes ?? "",
      items: items.map((i) => ({
        name_en: i.name_en,
        name_ar: i.name_ar,
        quantity: i.quantity,
        price: i.price,
      })),
      total,
      status: "pending",
      createdAt: new Date(nowIso),
    });
    const { pdfUrl, pdfPath } = await uploadOrderPdf(orderId, pdfBuffer);
    await supa
      .from("orders")
      .update({
        pdf_url: pdfUrl,
        pdf_path: pdfPath,
        pdf_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
  } catch (e) {
    console.error("[orders] PDF generation or upload failed:", e);
  }

  revalidateTag(CACHE_TAG_ORDERS);
  revalidateTag(`order:${orderId}`);

  return NextResponse.json({ id: orderId });
}

export async function GET(req: NextRequest) {
  try {
    await verifyAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;

  let orders = await getOrdersListForAdmin();
  if (status) {
    orders = orders.filter((o) => (o as { status?: string }).status === status);
  }
  return NextResponse.json({ orders });
}
