import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/verify-admin";
import { getPendingReviewsListForAdmin } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await verifyAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reviews = await getPendingReviewsListForAdmin();
  return NextResponse.json({ reviews });
}
