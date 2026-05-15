import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();
  (await cookies()).delete("session");
  return NextResponse.json({ success: true });
}
