"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Link, useRouter } from "@/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = getSupabaseBrowser();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        await supabase.auth.signOut();
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Access denied. Not an admin account.");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-bold">
            <span className="text-[var(--accent)]">boozt</span>
            <span className="text-[var(--text-muted)]">.iq</span>
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Admin Panel</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
          <h2 className="mb-6 text-lg font-semibold text-[var(--text-primary)]">
            Sign in to continue
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-[var(--text-secondary)]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                suppressHydrationWarning
                required
                placeholder="adminbooztiq@gmail.com"
                autoComplete="email"
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-[var(--text-secondary)]">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  suppressHydrationWarning
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 pr-11 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--accent)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  suppressHydrationWarning
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-950/20"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              suppressHydrationWarning
              whileTap={{ scale: 0.97 }}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </motion.button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          <Link
            href="/"
            className="transition-colors hover:text-[var(--accent)]"
          >
            ← Back to shop
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
