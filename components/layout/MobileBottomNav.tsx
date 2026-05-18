"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Home, ShoppingBag, Heart, Store } from "lucide-react";
import { Link, usePathname } from "@/navigation";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const cartCount = useCartStore((s) => s.itemCount());
  const wishCount = useWishlistStore((s) => s.count());

  const items: {
    href: "/" | "/products" | "/cart" | "/wishlist";
    label: string;
    icon: typeof Home;
    match: (p: string) => boolean;
    badge?: number;
  }[] = [
    { href: "/", label: t("home"), icon: Home, match: (p) => p === "/" },
    {
      href: "/products",
      label: t("shop"),
      icon: Store,
      match: (p) => p.startsWith("/products"),
    },
    {
      href: "/cart",
      label: t("cart"),
      icon: ShoppingBag,
      match: (p) => p.startsWith("/cart"),
      badge: cartCount,
    },
    {
      href: "/wishlist",
      label: t("wishlist"),
      icon: Heart,
      match: (p) => p.startsWith("/wishlist"),
      badge: wishCount,
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[rgba(154,0,2,0.12)] bg-[rgba(13,5,6,0.95)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      aria-label="Mobile"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1">
        {items.map(({ href, label, icon: Icon, match, badge }) => {
          const active = pathname ? match(pathname) : false;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 font-body text-[10px] font-light tracking-[0.05em] transition-all duration-300",
                active
                  ? "text-[var(--accent)]"
                  : "text-[#4D3030] hover:text-[#9A7F7A]"
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
                {mounted &&
                  typeof badge === "number" &&
                  badge > 0 && (
                    <span className="absolute -end-1.5 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#9A0002] px-0.5 text-[9px] font-bold text-[#EFE6DE]">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
              </span>
              <span className="truncate uppercase">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
