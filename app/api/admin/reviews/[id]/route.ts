import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyAdmin } from "@/lib/verify-admin";
import { CACHE_TAG_REVIEWS } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supa = getSupabaseAdmin();
  const { data: row, error: gErr } = await supa
    .from("reviews")
    .select("product_id")
    .eq("id", id)
    .maybeSingle();
  if (gErr || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const productId = String((row as { product_id?: string }).product_id ?? "");

  const { error } = await supa.from("reviews").update({ approved: true }).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag(CACHE_TAG_REVIEWS);
  if (productId) revalidateTag(`reviews:${productId}`);

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supa = getSupabaseAdmin();
  const { data: row, error: gErr } = await supa
    .from("reviews")
    .select("product_id")
    .eq("id", id)
    .maybeSingle();
  if (gErr || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const productId = String((row as { product_id?: string }).product_id ?? "");

  const { error } = await supa.from("reviews").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag(CACHE_TAG_REVIEWS);
  if (productId) revalidateTag(`reviews:${productId}`);

  return NextResponse.json({ success: true });
}
