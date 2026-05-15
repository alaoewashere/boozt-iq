import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/verify-admin";
import { getOrderByIdCached } from "@/lib/server-data-orders";
import { buildOrderPdfBuffer } from "@/lib/order-pdf";
import { orderDocToPdfInput } from "@/lib/order-pdf-from-doc";

export const dynamic = "force-dynamic";

/**
 * Download order PDF (admin session required).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const row = await getOrderByIdCached(id);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { id: oid, ...data } = row;
  const pdfBuffer = await buildOrderPdfBuffer(
    orderDocToPdfInput(oid, data as Record<string, unknown>)
  );
  const safeName = `order_${id.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "no-store",
    },
  });
}
