"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Send, MessageCircle, Loader2 } from "lucide-react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function isArabic(s: string) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
    s
  );
}

function toWhatsAppLink(phoneDigits: string, text: string) {
  const digits = (phoneDigits || "").replace(/[^\d]/g, "");
  const msg = encodeURIComponent(text);
  if (!digits) return `https://wa.me/?text=${msg}`;
  return `https://wa.me/${digits}?text=${msg}`;
}

export function ChatWidget() {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const lastLang = useMemo(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const sample = lastUser?.content ?? "";
    return isArabic(sample) ? "ar" : "en";
  }, [messages]);

  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  const waLink = useMemo(
    () => toWhatsAppLink(waNumber, "Hi Boozt! I need help with..."),
    [waNumber]
  );

  useEffect(() => {
    if (!open) return;
    if (messages.length > 0) return;
    setMessages([
      {
        id: uid(),
        role: "assistant",
        content:
          "Welcome to Boozt.iq!\nكيف أقدر أساعدك؟ / How can I help you today?\nYou can ask me about our products, prices, or anything else!",
      },
    ]);
  }, [open, messages.length]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");

    const nextMessages = [
      ...messages,
      { id: uid(), role: "user" as const, content: text },
    ];
    const last10 = nextMessages.slice(-10);
    setMessages(nextMessages);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: last10.map((m) => ({ role: m.role, content: m.content })),
          conversationHistory: last10.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
      };

      const replyFromApi =
        typeof data.reply === "string" && data.reply.trim()
          ? data.reply.trim()
          : "";

      const debugError =
        typeof data.error === "string" && data.error.trim()
          ? data.error.trim()
          : res.ok
            ? ""
            : `HTTP ${res.status}`;

      const reply = res.ok
        ? replyFromApi ||
          (lastLang === "ar"
            ? "عذرًا، حدث خطأ. تواصل معنا على واتساب."
            : "Sorry — something went wrong. Please contact us on WhatsApp.")
        : `API Error: ${debugError}`;

      setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown client error";
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content: `Client Error: ${msg}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(154,0,2,0.25)] bg-[rgba(17,6,8,0.95)] text-[#9A0002] shadow-lg shadow-black/30 backdrop-blur-[12px] transition-all duration-300 hover:border-[#9A0002] hover:shadow-[0_0_22px_rgba(154,0,2,0.22)]"
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" strokeWidth={1.5} />
      </button>

      {open && (
        <div className="absolute bottom-16 end-0 w-[min(380px,calc(100vw-2.5rem))] overflow-hidden rounded-[3px] border border-[rgba(154,0,2,0.2)] bg-[#110608] shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-[rgba(154,0,2,0.12)] bg-[#0D0506] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(154,0,2,0.25)] bg-[rgba(154,0,2,0.1)] font-body text-sm text-[#9A0002]">
                  AI
                </div>
                <span className="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full bg-[#9A0002] ring-2 ring-[#0D0506]" />
              </div>
              <div>
                <p className="font-body text-sm font-medium text-[#EFE6DE]">
                  Boozt Support
                </p>
                <p className="font-body text-[0.65rem] font-light tracking-[0.1em] text-[#4D3030]">
                  ONLINE
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(255,255,255,0.06)] text-[#9A7F7A] transition-colors duration-300 hover:text-[#9A0002]"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            className="h-[min(520px,70vh)] space-y-3 overflow-y-auto bg-[#0D0506] px-4 py-4"
          >
            {messages.map((m) => (
              <Bubble key={m.id} role={m.role} locale={locale} content={m.content} />
            ))}
            {busy && <TypingBubble />}
          </div>

          {/* Input */}
          <div className="border-t border-[rgba(154,0,2,0.12)] bg-[#110608] px-3 py-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder={locale === "ar" ? "اكتب رسالتك…" : "Type your message…"}
                className="max-h-24 flex-1 resize-none rounded-[2px] border border-[rgba(154,0,2,0.1)] bg-[#1A080A] px-3 py-2 font-body text-sm font-light text-[#EFE6DE] outline-none transition-all duration-300 placeholder:text-[#4D3030] focus:border-[rgba(154,0,2,0.45)]"
              />
              <button
                type="button"
                onClick={send}
                disabled={busy || !input.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#9A0002] text-[#EFE6DE] transition-all duration-300 hover:bg-[#C4000A] disabled:opacity-40"
                aria-label="Send"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-xs font-light text-[var(--accent)] transition-colors duration-300 hover:text-[var(--accent-hover)]"
              >
                Talk to human
              </a>
              <span className="font-body text-[10px] font-light text-[#4D3030]">
                {locale === "ar" ? "ردود قصيرة وسريعة" : "Short & quick replies"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({
  role,
  content,
  locale,
}: {
  role: "user" | "assistant";
  content: string;
  locale: string;
}) {
  const isUser = role === "user";
  const isAr = locale === "ar" || isArabic(content);

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-[3px] px-3 py-2 font-body text-sm font-light leading-relaxed",
          isUser
            ? "bg-[#9A0002] text-[#EFE6DE]"
            : "border border-[rgba(154,0,2,0.12)] bg-[#1A080A] text-[#EFE6DE]"
        )}
        dir={isAr ? "rtl" : "ltr"}
      >
        {content}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="rounded-[3px] border border-[rgba(154,0,2,0.12)] bg-[#1A080A] px-3 py-2 text-sm">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] opacity-50 [animation-delay:-0.2s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] opacity-50 [animation-delay:-0.1s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] opacity-50" />
        </span>
      </div>
    </div>
  );
}
