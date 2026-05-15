"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { PageHeading } from "@/components/ui/PageHeading";
import { cn } from "@/lib/utils";
import { Copy, Camera, Music2, MessageCircle, Sparkles } from "lucide-react";

type Platform = "instagram" | "tiktok" | "whatsapp";
type Lang = "ar" | "en";

type Captions = Record<Lang, Record<Platform, string>>;

const CATEGORIES = [
  { value: "vape", label: "Vape" },
  { value: "hookah", label: "Hookah" },
  { value: "accessories", label: "Accessories" },
  { value: "drinks", label: "Drinks" },
] as const;

function IconForPlatform({ platform }: { platform: Platform }) {
  if (platform === "instagram") return <Camera className="h-5 w-5" />;
  if (platform === "tiktok") return <Music2 className="h-5 w-5" />;
  return <MessageCircle className="h-5 w-5" />;
}

function ResultCard({
  title,
  platform,
  lang,
  text,
}: {
  title: string;
  platform: Platform;
  lang: Lang;
  text: string;
}) {
  const [copied, setCopied] = useState(false);
  const dir = lang === "ar" ? "rtl" : "ltr";

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <IconForPlatform platform={platform} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {title}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {platform.toUpperCase()} • {lang.toUpperCase()}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={doCopy}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium transition hover:bg-secondary",
            copied && "border-accent/40 text-accent"
          )}
          disabled={!text}
        >
          <Copy className="h-4 w-4" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div
        className={cn(
          "min-h-[120px] whitespace-pre-wrap rounded-xl bg-secondary/30 p-3 text-sm text-[var(--text-secondary)]",
          !text && "opacity-60"
        )}
        dir={dir}
      >
        {text || "—"}
      </div>
    </div>
  );
}

export default function CaptionAgentPage() {
  const locale = useLocale();
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] =
    useState<(typeof CATEGORIES)[number]["value"]>("vape");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Captions | null>(null);

  const canSubmit = useMemo(() => {
    return Boolean(productName.trim()) && Boolean(price.trim()) && !loading;
  }, [productName, price, loading]);

  const generate = async () => {
    setError(null);
    setCaptions(null);
    setLoading(true);
    try {
      const res = await fetch("/api/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, price, category }),
      });
      const j = (await res.json().catch(() => ({}))) as
        | Captions
        | { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(
          typeof (j as { message?: string }).message === "string"
            ? (j as { message: string }).message
            : typeof (j as { error?: string }).error === "string"
              ? (j as { error: string }).error
              : "Request failed"
        );
      }
      setCaptions(j as Captions);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <PageHeading size="compact" className="mb-0">
            Caption Agent
          </PageHeading>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Generate Instagram/TikTok/WhatsApp captions in Arabic + English.
          </p>
        </div>
        <div className="text-xs text-[var(--text-muted)]">
          Locale: <span className="text-[var(--text-secondary)]">{locale}</span>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-[var(--border)] bg-card p-4 shadow-sm md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
            Product Name
          </label>
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="مثال: اوكسبار ميز 2 برو — Example: Oxbar Miz 2 Pro"
            className="w-full rounded-xl border border-[var(--border)] bg-secondary/20 px-4 py-3 text-sm text-[var(--text-primary)] outline-none ring-0 focus:border-accent/40"
            disabled={loading}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
            Price (IQD)
          </label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="numeric"
            placeholder="25000"
            className="w-full rounded-xl border border-[var(--border)] bg-secondary/20 px-4 py-3 text-sm text-[var(--text-primary)] outline-none ring-0 focus:border-accent/40"
            disabled={loading}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
            Category
          </label>
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as (typeof CATEGORIES)[number]["value"])
            }
            className="w-full rounded-xl border border-[var(--border)] bg-secondary/20 px-4 py-3 text-sm text-[var(--text-primary)] outline-none ring-0 focus:border-accent/40"
            disabled={loading}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={generate}
            disabled={!canSubmit}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--accent)]/20 transition",
              !canSubmit && "cursor-not-allowed opacity-60"
            )}
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Generate Captions
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="mt-8">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Sparkles className="h-4 w-4 text-accent" />
          Results
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ResultCard
            title="Instagram AR 📸"
            platform="instagram"
            lang="ar"
            text={captions?.ar.instagram ?? ""}
          />
          <ResultCard
            title="Instagram EN 📸"
            platform="instagram"
            lang="en"
            text={captions?.en.instagram ?? ""}
          />

          <ResultCard
            title="TikTok AR 🎵"
            platform="tiktok"
            lang="ar"
            text={captions?.ar.tiktok ?? ""}
          />
          <ResultCard
            title="TikTok EN 🎵"
            platform="tiktok"
            lang="en"
            text={captions?.en.tiktok ?? ""}
          />

          <ResultCard
            title="WhatsApp AR 💬"
            platform="whatsapp"
            lang="ar"
            text={captions?.ar.whatsapp ?? ""}
          />
          <ResultCard
            title="WhatsApp EN 💬"
            platform="whatsapp"
            lang="en"
            text={captions?.en.whatsapp ?? ""}
          />
        </div>
      </div>
    </div>
  );
}

