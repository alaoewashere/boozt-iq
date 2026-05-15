"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProductDisplayName } from "@/lib/product-name";
import {
  fetchOrderTracking,
  type ChatTurn,
  type TrackedOrder,
} from "@/lib/order-tracking-client";
import { PageHeading } from "@/components/ui/PageHeading";

export function TrackPageClient() {
  const searchParams = useSearchParams();
  const orderFromUrl = searchParams.get("order");
  const locale = useLocale();
  const isAr = locale === "ar";
  const t = useTranslations("track");

  const [orderInput, setOrderInput] = useState(() => orderFromUrl?.trim() ?? "");
  const [tracked, setTracked] = useState<TrackedOrder | null>(null);
  const [thread, setThread] = useState<ChatTurn[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [busy, setBusy] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const autoTrackRanFor = useRef<string | null>(null);

  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  const waLink = useMemo(() => {
    const digits = (waNumber || "").replace(/[^\d]/g, "");
    const msg = encodeURIComponent(
      isAr
        ? "مرحباً Boozt! أحتاج مساعدة بخصوص طلبي."
        : "Hi Boozt! I need help with my order."
    );
    return digits ? `https://wa.me/${digits}?text=${msg}` : `https://wa.me/?text=${msg}`;
  }, [waNumber, isAr]);

  const fmtIqd = useCallback(
    (n: number) =>
      new Intl.NumberFormat(isAr ? "ar-IQ" : "en-IQ", {
        maximumFractionDigits: 0,
      }).format(Math.round(n)),
    [isAr]
  );

  const fmtDate = useCallback(
    (iso: string | null) => {
      if (!iso) return "—";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "—";
      return new Intl.DateTimeFormat(isAr ? "ar-IQ" : "en-IQ", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
    },
    [isAr]
  );

  const postTracking = useCallback(
    async (args: {
      orderNumber: string;
      history: ChatTurn[];
      resetThread?: boolean;
    }) => {
      const { orderNumber, history, resetThread } = args;
      setBusy(true);
      setListError(null);
      try {
        const { ok, data } = await fetchOrderTracking({
          orderNumber,
          history,
          locale: isAr ? "ar" : "en",
        });

        const reply =
          typeof data.reply === "string" && data.reply.trim()
            ? data.reply.trim()
            : isAr
              ? "حدث خطأ. حاول مرة أخرى أو تواصل معنا على واتساب."
              : "Something went wrong. Try again or contact us on WhatsApp.";

        if (!ok) {
          if (resetThread) {
            setTracked(null);
            setListError(reply);
            setThread([]);
          } else {
            setThread((prev) => [...prev, { role: "assistant", content: reply }]);
          }
          return;
        }

        if (data.found && data.order) {
          setTracked(data.order);
          setListError(null);
          if (resetThread) {
            setThread([{ role: "assistant", content: reply }]);
          } else {
            setThread((prev) => [...prev, { role: "assistant", content: reply }]);
          }
        } else {
          setTracked(null);
          setListError(reply);
          if (resetThread) {
            setThread([]);
          } else {
            setThread((prev) => [...prev, { role: "assistant", content: reply }]);
          }
        }
      } catch {
        const msg = isAr
          ? "تعذر الاتصال. تحقق من الشبكة أو جرّب لاحقًا."
          : "Could not connect. Check your network and try again.";
        setListError(resetThread ? msg : null);
        if (resetThread) {
          setTracked(null);
          setThread([]);
        } else {
          setThread((prev) => [...prev, { role: "assistant", content: msg }]);
        }
      } finally {
        setBusy(false);
      }
    },
    [isAr]
  );

  const runTrack = useCallback(
    async (orderNumberOverride?: string) => {
      const num = (orderNumberOverride ?? orderInput).trim();
      if (!num || busy) return;
      setOrderInput(num);
      setThread([]);
      await postTracking({
        orderNumber: num,
        history: [],
        resetThread: true,
      });
    },
    [orderInput, busy, postTracking]
  );

  useEffect(() => {
    const id = orderFromUrl?.trim();
    if (!id) return;
    setOrderInput(id);
    if (autoTrackRanFor.current === id) return;
    autoTrackRanFor.current = id;
    void runTrack(id);
  }, [orderFromUrl, runTrack]);

  const onSendFollowUp = async () => {
    const text = followUp.trim();
    if (!text || busy) return;
    if (!tracked?.orderNumber) {
      setListError(
        isAr ? "ابحث عن طلبك أولاً برقم الطلب." : "Track an order first with your order number."
      );
      return;
    }
    setFollowUp("");
    const userTurn: ChatTurn = { role: "user", content: text };
    const nextHistory = [...thread, userTurn].slice(-5);
    setThread((prev) => [...prev, userTurn]);
    await postTracking({
      orderNumber: tracked.orderNumber,
      history: nextHistory,
      resetThread: false,
    });
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10 md:py-12">
      <PageHeading className="mb-6 md:mb-8">{t("title")}</PageHeading>

      <div
        className="track-order-panel flex w-full flex-col overflow-hidden rounded-[2px] border border-[rgba(154,0,2,0.2)] bg-[#110608] text-[#EFE6DE] shadow-[0_24px_60px_rgba(0,0,0,0.7)]"
        style={{ minHeight: "min(480px, calc(100vh - 12rem))" }}
      >
        <div className="border-b border-[rgba(154,0,2,0.2)] px-4 py-3">
          <p className="font-heading text-[1.2rem] uppercase tracking-[0.08em] text-[#EFE6DE]">
            {t("panelTitle")}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#0D0506] px-4 py-4">
          <div className="space-y-2">
            <label className="sr-only" htmlFor="order-tracking-id-page">
              {t("orderPlaceholder")}
            </label>
            <input
              id="order-tracking-id-page"
              value={orderInput}
              onChange={(e) => setOrderInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void runTrack();
              }}
              placeholder={t("orderPlaceholder")}
              className="w-full rounded-[2px] border border-[rgba(154,0,2,0.2)] bg-[#0D0506] px-3 py-2.5 font-body text-[0.82rem] text-[#EFE6DE] outline-none placeholder:text-[#4D3030] focus:border-[rgba(154,0,2,0.6)] focus:shadow-[0_0_0_3px_rgba(154,0,2,0.08)]"
              dir="ltr"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => void runTrack()}
              disabled={busy || !orderInput.trim()}
              className="track-order-submit flex w-full min-h-11 items-center justify-center rounded-[2px] border-0 bg-[#9A0002] px-4 font-body text-[0.75rem] font-medium uppercase tracking-[0.18em] text-[#EFE6DE] transition-[background,box-shadow] duration-300 hover:bg-[#C4000A] hover:shadow-[0_0_24px_rgba(154,0,2,0.35)] disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                t("trackBtn")
              )}
            </button>
          </div>

          {tracked && (
            <div className="space-y-3 rounded-[2px] border border-[rgba(154,0,2,0.2)] bg-[#110608] p-3 text-sm">
              <p className="text-xs text-[#9A7F7A]">
                {t("orderNum")}:{" "}
                <span className="font-mono text-[#EFE6DE]">{tracked.orderNumber}</span>
              </p>
              <p className="text-xs text-[#9A7F7A]">
                {t("status")}: <span className="text-[#EFE6DE]">{tracked.status}</span>
              </p>
              <ul className="space-y-2 border-t border-[rgba(154,0,2,0.15)] pt-2">
                {tracked.items.map((it, i) => (
                  <li
                    key={`${it.name_en}-${i}`}
                    className="flex justify-between gap-2 text-xs text-[#9A7F7A]"
                  >
                    <span>
                      {getProductDisplayName(locale, it)} × {it.quantity}
                    </span>
                    <span className="tabular-nums text-[#EFE6DE]">
                      {fmtIqd(it.lineTotal)} {t("iqd")}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-sm font-medium text-[#EFE6DE]">
                {t("total")}: {fmtIqd(tracked.totalPrice)} {t("iqd")}
              </p>
              <p className="text-xs text-[#9A7F7A]">
                {t("date")}: {fmtDate(tracked.createdAt)}
              </p>
            </div>
          )}

          {listError && !tracked && (
            <p
              className="rounded-[2px] border border-red-500/40 bg-red-950/50 px-3 py-2 text-sm text-red-100"
              dir={isAr ? "rtl" : "ltr"}
            >
              {listError}
            </p>
          )}

          {thread.length > 0 && (
            <div className="space-y-2 border-t border-[rgba(154,0,2,0.15)] pt-3">
              {thread.map((m, i) => (
                <div
                  key={`${i}-${m.role}`}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[92%] whitespace-pre-wrap rounded-[2px] px-3 py-2 text-xs sm:text-sm",
                      m.role === "user"
                        ? "bg-[#9A0002] text-[#EFE6DE]"
                        : "border border-[rgba(154,0,2,0.2)] bg-[#1A080A] text-[#EFE6DE]"
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          )}
            </div>

        <div className="shrink-0 space-y-2 border-t border-[rgba(154,0,2,0.2)] px-4 py-3">
          {tracked && (
            <div className="flex items-end gap-2">
              <textarea
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void onSendFollowUp();
                  }
                }}
                rows={1}
                placeholder={t("followPlaceholder")}
                disabled={busy}
                className="max-h-20 min-h-[2.5rem] flex-1 resize-none rounded-[2px] border border-[rgba(154,0,2,0.2)] bg-[#0D0506] px-3 py-2 font-body text-[0.82rem] text-[#EFE6DE] outline-none placeholder:text-[#4D3030] focus:border-[rgba(154,0,2,0.6)] disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => void onSendFollowUp()}
                disabled={busy || !followUp.trim()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[2px] bg-[#9A0002] text-[#EFE6DE] disabled:opacity-50"
                aria-label={isAr ? "إرسال" : "Send"}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          )}
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="track-order-help flex min-h-10 w-full items-center justify-center rounded-[2px] border border-[rgba(154,0,2,0.2)] bg-[#0D0506] py-2 text-center font-body text-[0.7rem] tracking-[0.1em] text-[#4D3030] hover:text-[#9A0002]"
          >
            {t("needHelp")}
          </a>
            </div>
            </div>
            </div>
  );
}
