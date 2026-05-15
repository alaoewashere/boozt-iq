"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "boozt-announce-dismissed";

export function AnnouncementBanner() {
  const t = useTranslations("banner");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      setVisible(localStorage.getItem(STORAGE_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="relative z-[60] border-b border-[rgba(154,0,2,0.15)] bg-[rgba(154,0,2,0.06)] px-4 py-2.5 text-center">
      <p className="mx-auto max-w-4xl pe-10 font-body text-[0.8rem] font-light tracking-[0.05em] text-[var(--text-primary)] md:pe-0">
        {t("message")}
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[#9A7F7A] transition-colors duration-300 hover:text-[#9A0002]"
        aria-label={t("dismiss")}
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
