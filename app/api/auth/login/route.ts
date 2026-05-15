import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email?: string };

  const supabase = await getSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 }
    );
  }

  const userEmail = (user.email ?? "").toLowerCase();
  const submittedEmail = (email ?? "").toLowerCase();
  if (userEmail !== submittedEmail) {
    return NextResponse.json(
      { error: "Session mismatch" },
      { status: 401 }
    );
  }

  const isAdmin =
    ADMIN_EMAILS.has(userEmail) ||
    (user.app_metadata as Record<string, unknown>)?.role === "admin";

  if (!isAdmin) {
    return NextResponse.json(
      { error: "Access denied. Not an admin account." },
      { status: 403 }
    );
  }

  const fiveDays = 60 * 60 * 24 * 5;
  (await cookies()).set("session", user.id, {
    maxAge: fiveDays,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return NextResponse.json({ success: true });
}
