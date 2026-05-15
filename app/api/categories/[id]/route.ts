import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyAdmin } from "@/lib/verify-admin";
import { CACHE_TAG_CATEGORIES } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (body.name_en != null) patch.name_en = body.name_en;
  if (body.name_ar != null) patch.name_ar = body.name_ar;
  if (body.slug != null) patch.slug = body.slug;
  if (body.icon != null) patch.icon = body.icon;
  if (body.order != null) patch.sort_order = body.order;

  const supa = getSupabaseAdmin();
  const { error } = await supa.from("categories").update(patch).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag(CACHE_TAG_CATEGORIES);

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
  await supa.from("subcategories").delete().eq("category_id", id);
  const { error } = await supa.from("categories").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag(CACHE_TAG_CATEGORIES);

  return NextResponse.json({ success: true });
}
