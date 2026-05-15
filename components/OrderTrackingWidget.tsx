"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "@/navigation";
import { X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProductDisplayName } from "@/lib/product-name";

export const OPEN_ORDER_TRACKING_EVENT = "boozt:open-order-tracking";

type ChatTurn = { role: "user" | "assistant"; content: string };

type OrderItemLine = {
  name_en: string;
  name_ar: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type TrackedOrder = {
  orderNumber: string;
  status: string;
  items: OrderItemLine[];
  totalPrice: number;
  createdAt: string | null;
  customerName: string;
  deliveryAddress: string;
};

function toWhatsAppLink(phoneDigits: string, text: string) {
  const digits = (phoneDigits || "").replace(/[^\d]/g, "");
  const msg = encodeURIComponent(text);
  if (!digits) return `https://wa.me/?text=${msg}`;
  return `https://wa.me/${digits}?text=${msg}`;
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase().trim();
  if (s === "pending" || s === "processing") {
    return "border-amber-500/45 bg-amber-500/15 text-amber-100";
  }
  if (s === "confirmed" || s === "preparing") {
    return "border-blue-500/45 bg-blue-500/15 text-blue-100";
  }
  if (s === "shipped" || s === "out for delivery") {
    return "border-orange-500/45 bg-orange-500/15 text-orange-100";
  }
  if (s === "delivered") {
    return "border-emerald-500/45 bg-emerald-500/15 text-emerald-100";
  }
  if (s === "cancelled") {
    return "border-red-500/45 bg-red-500/15 text-red-100";
  }
  return "border-zinc-600 bg-zinc-800/90 text-zinc-200";
}

export function OrderTrackingWidget() {
  const pathname = usePathname();
  const locale = useLocale();
  const isAr = locale === "ar";

  const [open, setOpen] = useState(false);
  const [orderInput, setOrderInput] = useState("");
  const [tracked, setTracked] = useState<TrackedOrder | null>(null);
  const [thread, setThread] = useState<ChatTurn[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [busy, setBusy] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  const waLink = useMemo(
    () =>
      toWhatsAppLink(
        waNumber,
        isAr
          ? "مرحباً Boozt! أحتاج مساعدة بخصوص طلبي."
          : "Hi Boozt! I need help with my order."
      ),
    [waNumber, isAr]
  );

  const t = useMemo(
    () => ({
      floatLabel: isAr ? "تتبع الطلب" : "Track Order",
      title: isAr ? "تتبع طلبك 📦" : "Track Your Order 📦",
      orderPlaceholder: isAr ? "أدخل رقم الطلب" : "Enter your order number",
      trackBtn: isAr ? "تتبع الطلب" : "Track Order",
      orderNum: isAr ? "رقم الطلب" : "Order Number",
      customer: isAr ? "اسم الزبون" : "Customer Name",
      status: isAr ? "الحالة" : "Status",
      items: isAr ? "المنتجات" : "Items",
      total: isAr ? "المجموع" : "Total Price",
      date: isAr ? "تاريخ الطلب" : "Order Date",
      iqd: isAr ? "د.ع" : "IQD",
      needHelp: isAr ? "تحتاج مساعدة؟ تواصل معنا 💬" : "Need help? Contact us 💬",
      followPlaceholder: isAr ? "اسأل عن طلبك…" : "Ask about your order…",
    }),
    [isAr]
  );

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_ORDER_TRACKING_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ORDER_TRACKING_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, thread, busy, tracked, listError]);

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
        const res = await fetch("/api/order-tracking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderNumber: orderNumber.trim(),
            conversationHistory: history.slice(-5),
            locale: isAr ? "ar" : "en",
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          found?: boolean;
          order?: TrackedOrder | null;
          reply?: string;
          error?: string;
        };

        const reply =
          typeof data.reply === "string" && data.reply.trim()
            ? data.reply.trim()
            : isAr
              ? "حدث خطأ. حاول مرة أخرى أو تواصل معنا على واتساب."
              : "Something went wrong. Try again or contact us on WhatsApp.";

        if (!res.ok) {
          if (resetThread) {
            setTracked(null);
            setListError(reply);
            setThread([]);
          } else {
            setListError(null);
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

  const onTrack = async () => {
    const num = orderInput.trim();
    if (!num || busy) return;
    setThread([]);
    await postTracking({
      orderNumber: num,
      history: [],
      resetThread: true,
    });
  };

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

  if (pathname?.includes("/admin") || pathname?.includes("/track")) {
    return null;
  }

  const bottomOffset =
    "bottom-[max(1rem,calc(6.25rem+env(safe-area-inset-bottom,0px)))] md:bottom-6";

  return (
    <div
      className={cn(
        "track-order-widget fixed start-4 z-[55] flex flex-col items-start",
        bottomOffset
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="track-order-trigger group relative inline-flex h-14 max-w-[200px] items-center gap-2 rounded-[2px] border border-[rgba(154,0,2,0.3)] bg-[#110608] px-4 font-body text-[0.72rem] font-light uppercase tracking-[0.15em] text-[#EFE6DE] shadow-lg shadow-black/40 backdrop-blur-[12px] transition-[border-color,box-shadow] duration-300 hover:border-[#9A0002] hover:shadow-[0_0_20px_rgba(154,0,2,0.2)]"
        aria-expanded={open}
        aria-label={t.floatLabel}
      >
        <span className="text-lg" aria-hidden>
          📦
        </span>
        <span className="truncate">{t.floatLabel}</span>
      </button>

      {open && (
        <div
          className="track-order-panel absolute bottom-[4.25rem] start-0 flex w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[2px] border border-[rgba(154,0,2,0.2)] bg-[#110608] text-[#EFE6DE] shadow-[0_24px_60px_rgba(0,0,0,0.7)] backdrop-blur-[16px]"
          style={{ height: "min(480px, calc(100vh - 7rem))" }}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[rgba(154,0,2,0.2)] bg-[#110608] px-3 py-2.5 sm:px-4">
            <p className="font-heading text-[1.2rem] uppercase tracking-[0.08em] text-[#EFE6DE]">
              {t.title}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="track-order-close inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border-0 bg-transparent text-[#4D3030] transition-colors duration-200 hover:text-[#9A0002]"
              aria-label={isAr ? "إغلاق" : "Close"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#0D0506] px-3 py-3 sm:px-4"
          >
            <div className="space-y-2">
              <label className="sr-only" htmlFor="order-tracking-id">
                {t.orderPlaceholder}
              </label>
              <input
                id="order-tracking-id"
                value={orderInput}
                onChange={(e) => setOrderInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void onTrack();
                }}
                placeholder={t.orderPlaceholder}
                className="w-full rounded-[2px] border border-[rgba(154,0,2,0.2)] bg-[#0D0506] px-3 py-2.5 font-body text-[0.82rem] text-[#EFE6DE] outline-none placeholder:text-[#4D3030] focus:border-[rgba(154,0,2,0.6)] focus:shadow-[0_0_0_3px_rgba(154,0,2,0.08)]"
                dir="ltr"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => void onTrack()}
                disabled={busy || !orderInput.trim()}
                className="track-order-submit flex w-full min-h-11 items-center justify-center rounded-[2px] border-0 bg-[#9A0002] px-4 font-body text-[0.75rem] font-medium uppercase tracking-[0.18em] text-[#EFE6DE] shadow-sm transition-[background,box-shadow] duration-300 hover:bg-[#C4000A] hover:shadow-[0_0_24px_rgba(154,0,2,0.35)] disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  t.trackBtn
                )}
              </button>
            </div>

            {tracked && (
              <div className="space-y-3 rounded-[2px] border border-[rgba(154,0,2,0.2)] bg-[#110608] p-3 text-sm text-[#EFE6DE]">
                <Row label={`✅ ${t.orderNum}`} value={tracked.orderNumber} mono />
                <Row label={`✅ ${t.customer}`} value={tracked.customerName || "—"} />
                <div>
                  <p className="text-xs font-medium text-[#9A7F7A]">✅ {t.status}</p>
                  <span
                    className={cn(
                      "mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                      statusBadgeClass(tracked.status)
                    )}
                  >
                    {tracked.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#9A7F7A]">✅ {t.items}</p>
                  <ul className="mt-2 space-y-2">
                    {tracked.items.map((it, i) => (
                      <li
                        key={`${it.name_en}-${i}`}
                        className="flex flex-wrap justify-between gap-2 border-b border-dashed border-[rgba(154,0,2,0.15)] pb-2 text-[#9A7F7A] last:border-0"
                      >
                        <span className="min-w-0 flex-1">
                          {getProductDisplayName(locale, it)} × {it.quantity}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums text-[#EFE6DE]">
                          {fmtIqd(it.lineTotal)} {t.iqd}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Row
                  label={`✅ ${t.total}`}
                  value={`${fmtIqd(tracked.totalPrice)} ${t.iqd}`}
                  strong
                />
                <Row label={`✅ ${t.date}`} value={fmtDate(tracked.createdAt)} />
              </div>
            )}

            {listError && !tracked && (
              <p
                className="rounded-xl border border-red-500/40 bg-red-950/50 px-3 py-2 text-sm text-red-100"
                dir={isAr ? "rtl" : "ltr"}
              >
                {listError}
              </p>
            )}

            {thread.length > 0 && (
              <div className="space-y-2 border-t border-[rgba(154,0,2,0.15)] pt-3">
                <p className="font-body text-xs font-medium uppercase tracking-[0.1em] text-[#4D3030]">
                  {isAr ? "المساعد" : "Assistant"}
                </p>
                {thread.map((m, i) => (
                  <div
                    key={`${i}-${m.role}-${m.content.slice(0, 24)}`}
                    className={cn(
                      "flex",
                      m.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm sm:text-sm",
                        m.role === "user"
                          ? "bg-[#9A0002] text-[#EFE6DE]"
                          : "border border-[rgba(154,0,2,0.2)] bg-[#1A080A] text-[#EFE6DE]"
                      )}
                      dir={
                        /[\u0600-\u06FF]/.test(m.content) ? "rtl" : "ltr"
                      }
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="flex justify-start">
                    <div className="rounded-[2px] border border-[rgba(154,0,2,0.2)] bg-[#1A080A] px-3 py-2">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9A7F7A]/70 [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9A7F7A]/70 [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9A7F7A]/70" />
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 space-y-2 border-t border-[rgba(154,0,2,0.2)] bg-[#110608] px-3 py-2.5 sm:px-4">
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
                  placeholder={t.followPlaceholder}
                  disabled={busy}
                  className="max-h-20 min-h-[2.5rem] flex-1 resize-none rounded-[2px] border border-[rgba(154,0,2,0.2)] bg-[#0D0506] px-3 py-2 font-body text-[0.82rem] text-[#EFE6DE] outline-none placeholder:text-[#4D3030] focus:border-[rgba(154,0,2,0.6)] focus:shadow-[0_0_0_3px_rgba(154,0,2,0.08)] disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => void onSendFollowUp()}
                  disabled={busy || !followUp.trim()}
                  className="track-order-submit inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[2px] border-0 bg-[#9A0002] text-[#EFE6DE] transition-[background,box-shadow] duration-300 hover:bg-[#C4000A] hover:shadow-[0_0_24px_rgba(154,0,2,0.35)] disabled:opacity-50"
                  aria-label={isAr ? "إرسال" : "Send"}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            )}
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="track-order-help flex min-h-10 w-full items-center justify-center rounded-[2px] border border-[rgba(154,0,2,0.2)] bg-[#0D0506] px-3 py-2 text-center font-body text-[0.7rem] font-light tracking-[0.1em] text-[#4D3030] transition-colors duration-200 hover:text-[#9A0002]"
            >
              {t.needHelp}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  strong,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-[#9A7F7A]">{label}</p>
      <p
        className={cn(
          "mt-0.5 break-words text-[#9A7F7A]",
          mono && "font-mono text-[13px] text-[#EFE6DE]",
          strong && "text-base font-semibold text-[#EFE6DE]"
        )}
      >
        {value}
      </p>
    </div>
  );
}
