import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyAdmin } from "@/lib/verify-admin";
import {
  CACHE_TAG_CATEGORIES,
  getCategoriesApiPayload,
} from "@/lib/server-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await getCategoriesApiPayload();
  return NextResponse.json(payload);
}

export async function POST(req: NextRequest) {
  try {
    await verifyAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name_en = String(body.name_en || "");
  const name_ar = String(body.name_ar || "");
  const slug = String(body.slug || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
  const icon = String(body.icon || "📦");
  const order = Number(body.order) || 0;

  if (!slug || !name_en) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const id = randomUUID();
  const supa = getSupabaseAdmin();
  const { error } = await supa.from("categories").insert({
    id,
    slug,
    name_en,
    name_ar,
    icon,
    sort_order: order,
    product_count: 0,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag(CACHE_TAG_CATEGORIES);

  return NextResponse.json({ id });
}
