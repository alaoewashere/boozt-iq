import type { ReactNode } from "react";
import { DM_Sans, Bebas_Neue, El_Messiri, Noto_Naskh_Arabic } from "next/font/google";
import IntroScreen from "@/components/IntroScreen";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-en",
  display: "swap",
  weight: ["200", "300", "400", "500"],
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: "400",
});

const notoArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-ar",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const elMessiri = El_Messiri({
  subsets: ["arabic"],
  variable: "--font-ar-luxury",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark ${dmSans.variable} ${bebasNeue.variable} ${notoArabic.variable} ${elMessiri.variable}`}
    >
      <body className="min-h-screen bg-[#0D0506] text-[#EFE6DE] antialiased">
        <IntroScreen />
        {children}
      </body>
    </html>
  );
}
