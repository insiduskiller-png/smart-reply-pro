"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearBrowserSession } from "@/lib/client-auth";
import { isTemporarySessionExpired, setStoredSessionMode } from "@/lib/session-persistence";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showExpiredMessage, setShowExpiredMessage] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setShowExpiredMessage(params.get("expired") === "1");
  }, []);

  useEffect(() => {
    let mounted = true;

    async function redirectIfAlreadyLoggedIn() {
      try {
        if (isTemporarySessionExpired()) {
          await clearBrowserSession();
          return;
        }

        const meResponse = await fetch("/api/auth/me", { cache: "no-store" });
        const meData = await meResponse.json().catch(() => null);
        if (mounted && meResponse.ok && meData?.user) {
          console.info("login: already authenticated, redirecting to dashboard");
          router.replace("/dashboard");
          return;
        }

        const {
          data: { session },
        } = await supabaseBrowser.auth.getSession();

        if (mounted && session?.user) {
          await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: session.access_token }),
          }).catch(() => null);

          console.info("login: client session found, redirecting to dashboard");
          router.replace("/dashboard");
        }
      } catch {
        // Non-blocking check only
      }
    }

    void redirectIfAlreadyLoggedIn();

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        if (isTemporarySessionExpired()) {
          await clearBrowserSession();
          return;
        }

        console.info("login: auth state listener observed session");
        router.replace("/dashboard");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let redirectAttempted = false;

    console.info("login started");
    setLoading(true);
    setError("");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || "Login failed");
        return;
      }

      if (data.success) {
        console.info("supabase auth success");
        setStoredSessionMode(rememberMe ? "persistent" : "temporary");

        if (data.sessionToken && data.refreshToken) {
          console.info("session received");

          // Sync browser session without blocking redirect.
          void supabaseBrowser.auth
            .setSession({
              access_token: data.sessionToken,
              refresh_token: data.refreshToken,
            })
            .catch(() => {
              // Server-cookie auth flow should still succeed.
            });
        }

        console.info("redirecting to dashboard");
        redirectAttempted = true;
        router.replace("/dashboard");

        // Fallback in case client navigation gets stalled by runtime state.
        fallbackTimer = setTimeout(() => {
          if (typeof window !== "undefined") {
            window.location.assign("/dashboard");
          }
        }, 1200);

        return;
      }

      setError("Login failed. Please try again.");
    } catch (e) {
      console.error("Login error:", e);
      const isAbort = e instanceof DOMException && e.name === "AbortError";
      setError(isAbort ? "Login timed out. Please try again." : "Network error. Please try again.");
    } finally {
      if (!redirectAttempted && fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      setLoading(false);
      console.info("login finished");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="card p-6 md:p-8">
          <h1 className="mb-6 text-2xl font-semibold text-white">Login</h1>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="h-12 w-full rounded-md border border-slate-700 bg-slate-950 px-4 text-base text-white placeholder:text-slate-500 disabled:opacity-60 md:h-10 md:px-3 md:text-sm"
              required
            />
            
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="h-12 w-full rounded-md border border-slate-700 bg-slate-950 px-4 text-base text-white placeholder:text-slate-500 disabled:opacity-60 md:h-10 md:px-3 md:text-sm"
              required
            />

            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500"
              />
              <span>Remember me</span>
            </label>
            
            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-md border-none bg-sky-500 px-4 text-base font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 md:h-10 md:text-sm"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          
          {error && (
            <div className="mt-4 rounded-md bg-rose-950 p-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          {!error && showExpiredMessage ? (
            <div className="mt-4 rounded-md border border-amber-800/60 bg-amber-950/40 p-3 text-sm text-amber-200">
              Your session expired. Please sign in again.
            </div>
          ) : null}

          <div className="mt-5 text-center text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-sky-400 hover:text-sky-300">
              Register here
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
