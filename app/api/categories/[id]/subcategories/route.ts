import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyAdmin } from "@/lib/verify-admin";
import { CACHE_TAG_CATEGORIES } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: categoryId } = await params;
  const body = await req.json();
  const name_en = String(body.name_en || "");
  const name_ar = String(body.name_ar || "");
  const slug = String(body.slug || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
  const order = Number(body.order) || 0;

  if (!slug || !name_en) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const subId = randomUUID();
  const supa = getSupabaseAdmin();
  const { error } = await supa.from("subcategories").insert({
    id: subId,
    category_id: categoryId,
    slug,
    name_en,
    name_ar,
    sort_order: order,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag(CACHE_TAG_CATEGORIES);

  return NextResponse.json({ id: subId });
}
