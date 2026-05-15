import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export default async function AdminDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = (await cookies()).get("session")?.value;
  if (!session) {
    redirect(`/${locale}/admin/login`);
  }
  try {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      redirect(`/${locale}/admin/login`);
    }

    const email = (user.email ?? "").toLowerCase();
    const isAdmin =
      ADMIN_EMAILS.has(email) ||
      (user.app_metadata as Record<string, unknown>)?.role === "admin";

    if (!isAdmin) {
      redirect(`/${locale}/admin/login`);
    }
  } catch {
    redirect(`/${locale}/admin/login`);
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-auto bg-secondary/30 px-4 pb-8 pt-16 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
