import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const ORDER_REPORTS_PREFIX = "order-reports";
const BUCKET = "order-reports";

/**
 * Upload order PDF to Supabase Storage. Filename: order_{orderId}.pdf
 */
export async function uploadOrderPdf(
  orderId: string,
  buffer: Buffer
): Promise<{ pdfUrl: string; pdfPath: string }> {
  const safeId = orderId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const pdfPath = `order_${safeId}.pdf`;

  const supa = getSupabaseAdmin();

  const { error } = await supa.storage
    .from(BUCKET)
    .upload(pdfPath, buffer, {
      contentType: "application/pdf",
      cacheControl: "31536000",
      upsert: true,
    });

  if (error) {
    throw new Error(`PDF upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supa.storage.from(BUCKET).getPublicUrl(pdfPath);

  return { pdfUrl: publicUrl, pdfPath: `${BUCKET}/${pdfPath}` };
}
