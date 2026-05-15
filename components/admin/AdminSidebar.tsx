"use client";

import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  LogOut,
  Menu,
  X,
  MessageSquareQuote,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Link, usePathname } from "@/navigation";
import { useLocale } from "next-intl";

const items = [
  { href: "/admin", icon: LayoutDashboard, key: "dashboard" as const },
  { href: "/admin/products", icon: Package, key: "products" as const },
  { href: "/admin/categories", icon: FolderTree, key: "categories" as const },
  { href: "/admin/orders", icon: ShoppingBag, key: "orders" as const },
  { href: "/admin/reviews", icon: MessageSquareQuote, key: "reviews" as const },
  { href: "/admin/caption-agent", icon: Sparkles, key: "captionAgent" as const },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("admin");
  const pathname = usePathname();

  return (
    <>
      <div className="mb-8 flex items-center gap-2 px-2">
        <span className="text-xl font-bold text-accent">boozt</span>
        <span className="text-[var(--text-muted)]">.iq</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map(({ href, icon: Icon, key }) => {
          const active =
            href === "/admin"
              ? pathname === "/admin"
              : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-accent/15 text-accent"
                  : "text-[var(--text-secondary)] hover:bg-secondary"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {t(key)}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function AdminSidebar() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = `/${locale}/admin/login`;
  };

  return (
    <div className="relative shrink-0 md:w-56">
      <button
        type="button"
        className="fixed start-4 top-4 z-40 rounded-md border border-[var(--border)] bg-card p-2 md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-e border-[var(--border)] bg-card p-4 md:flex">
        <NavLinks />
        <button
          type="button"
          onClick={logout}
          className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-error hover:bg-secondary"
        >
          <LogOut className="h-5 w-5" />
          {t("logout")}
        </button>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-full w-64 flex-col bg-card p-4 shadow-xl">
            <button
              type="button"
              className="absolute end-2 top-2 p-2"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <NavLinks onNavigate={() => setOpen(false)} />
            <button
              type="button"
              onClick={logout}
              className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-error"
            >
              <LogOut className="h-5 w-5" />
              {t("logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
