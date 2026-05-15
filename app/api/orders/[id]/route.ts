import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CACHE_TAG_ORDERS } from "@/lib/server-data";
import { verifyAdmin } from "@/lib/verify-admin";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  status: z.enum([
    "pending",
    "confirmed",
    "preparing",
    "out for delivery",
    "delivered",
    "cancelled",
    "processing",
    "shipped",
  ]),
});

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
  const json = await req.json();
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const supa = getSupabaseAdmin();
  const { error } = await supa
    .from("orders")
    .update({
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag(CACHE_TAG_ORDERS);
  revalidateTag(`order:${id}`);

  return NextResponse.json({ success: true });
}
