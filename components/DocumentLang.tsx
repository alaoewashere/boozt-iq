"use client";

import { useLayoutEffect } from "react";

/** Sets <html lang/dir> for locale (root layout cannot read [locale] dynamically). */
export function DocumentLang({ locale }: { locale: string }) {
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);
  return null;
}
