"use client";

import { usePathname } from "@/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { WhatsAppFloatingButton } from "../whatsapp/WhatsAppFloatingButton";
import { ChatWidget } from "@/components/ChatWidget";

export function SiteShell({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.includes("/admin") ?? false;
  const isCartPage = pathname === "/cart";

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0D0506]">
      <AnnouncementBanner />
      <Navbar locale={locale} />
      <main
        className={
          isCartPage
            ? "flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0D0506] pb-24 md:overflow-visible md:pb-0"
            : "flex-1 bg-[#0D0506] pb-24 md:pb-0"
        }
      >
        {children}
      </main>
      <Footer className={isCartPage ? "hidden md:block" : undefined} />
      <CartDrawer locale={locale} />
      <MobileBottomNav />

      <div className="fixed end-4 z-[60] flex flex-row items-center gap-3 bottom-[max(1rem,calc(6.25rem+env(safe-area-inset-bottom,0px)))] md:bottom-6">
        <WhatsAppFloatingButton />
        <ChatWidget />
      </div>
    </div>
  );
}
