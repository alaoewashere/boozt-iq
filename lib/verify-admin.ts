import { cookies } from "next/headers";
import { getSupabaseServer } from "./supabase/server";

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export async function verifyAdmin() {
  const session = (await cookies()).get("session")?.value;
  if (!session) throw new Error("Unauthorized");

  const supabase = await getSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("Unauthorized");

  const email = (user.email ?? "").toLowerCase();
  const isAdmin =
    ADMIN_EMAILS.has(email) ||
    (user.app_metadata as Record<string, unknown>)?.role === "admin";

  if (!isAdmin) throw new Error("Forbidden");

  return { uid: user.id, email: user.email, admin: true };
}
