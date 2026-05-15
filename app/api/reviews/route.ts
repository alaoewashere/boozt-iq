import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CACHE_TAG_REVIEWS } from "@/lib/server-data";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  productId: z.string().min(1),
  reviewerName: z.string().trim().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1),
  locale: z.string().min(1).max(8),
});

/** Public: submit a review (pending moderation). */
export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { productId, reviewerName, rating, comment, locale } = parsed.data;
  const supa = getSupabaseAdmin();
  const { error } = await supa.from("reviews").insert({
    product_id: productId,
    reviewer_name: reviewerName,
    rating,
    comment,
    locale,
    approved: false,
  });
  if (error) {
    console.error("[reviews POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag(CACHE_TAG_REVIEWS);
  revalidateTag(`reviews:${productId}`);
  return NextResponse.json({ ok: true });
}
