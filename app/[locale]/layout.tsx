import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { Providers } from "@/components/providers";
import { SiteShell } from "@/components/layout/SiteShell";
import { OrderTrackingWidget } from "@/components/OrderTrackingWidget";
import { DocumentLang } from "@/components/DocumentLang";

export const metadata: Metadata = {
  title: {
    default: "boozt.iq — Lifestyle Shop",
    template: "%s | boozt.iq",
  },
  description: "Hookah, vape, disposable pods & board games in Iraq.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "en" | "ar")) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <div
      className={`min-h-screen ${locale === "ar" ? "font-ar" : "font-en"}`}
    >
      <DocumentLang locale={locale} />
      <NextIntlClientProvider locale={locale} messages={messages}>
        <Providers>
          <SiteShell locale={locale}>{children}</SiteShell>
          <OrderTrackingWidget />
        </Providers>
      </NextIntlClientProvider>
    </div>
  );
}
