"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearBrowserSession } from "@/lib/client-auth";
import { useAuth } from "@/components/auth-provider";
import { isTemporarySessionExpired, setStoredSessionMode } from "@/lib/session-persistence";
import { supabaseBrowser } from "@/lib/supabase-browser";

const LOGIN_COOLDOWN_STORAGE_KEY = "srp_login_cooldown_until";

export default function LoginPage() {
  const router = useRouter();
  const { establishAuthenticatedSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [showExpiredMessage, setShowExpiredMessage] = useState(false);
  const [showResetSuccessMessage, setShowResetSuccessMessage] = useState(false);
  const [showVerifiedMessage, setShowVerifiedMessage] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState(0);

  const isCooldownActive = Boolean(cooldownUntil && cooldownUntil > Date.now());

  function resetFormErrors() {
    setError("");
    setEmailError("");
    setPasswordError("");
  }

  function validateForm() {
    let isValid = true;
    resetFormErrors();

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setEmailError("Enter your email address.");
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setEmailError("Enter a valid email address.");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Enter your password.");
      isValid = false;
    }

    return isValid;
  }

  function resolveLoginError(message: string | undefined, status: number) {
    const normalized = String(message ?? "").toLowerCase();

    if (status === 401 || normalized.includes("invalid login credentials") || normalized.includes("invalid credentials")) {
      return "Incorrect email or password. Please try again.";
    }

    if (status >= 500 || normalized.includes("server error")) {
      return "We couldn’t sign you in right now. Please try again in a moment.";
    }

    if (status === 403 || normalized.includes("verify your email") || normalized.includes("email not confirmed")) {
      return "Please verify your email before signing in.";
    }

    if (normalized.includes("email and password required")) {
      return "Enter your email and password to continue.";
    }

    return message || "Unable to sign in right now. Please try again.";
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setShowExpiredMessage(params.get("expired") === "1");
    setShowResetSuccessMessage(params.get("reset") === "success");
    setShowVerifiedMessage(params.get("verified") === "1");

    const storedUntil = Number(window.sessionStorage.getItem(LOGIN_COOLDOWN_STORAGE_KEY) || "0");
    if (storedUntil > Date.now()) {
      setCooldownUntil(storedUntil);
      setCooldownSecondsLeft(Math.ceil((storedUntil - Date.now()) / 1000));
    } else {
      window.sessionStorage.removeItem(LOGIN_COOLDOWN_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownSecondsLeft(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownSecondsLeft(remaining);

      if (remaining <= 0) {
        setCooldownUntil(null);
        setError("");
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(LOGIN_COOLDOWN_STORAGE_KEY);
        }
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [cooldownUntil]);

  function startCooldown(seconds: number) {
    const safeSeconds = Math.max(1, Math.min(300, Math.ceil(seconds)));
    const until = Date.now() + safeSeconds * 1000;
    setCooldownUntil(until);
    setCooldownSecondsLeft(safeSeconds);
    setStatusMessage("");
    setError("");

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(LOGIN_COOLDOWN_STORAGE_KEY, String(until));
    }
  }

  function clearCooldown() {
    setCooldownUntil(null);
    setCooldownSecondsLeft(0);

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(LOGIN_COOLDOWN_STORAGE_KEY);
    }
  }

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

    if (loading || isCooldownActive) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let redirectAttempted = false;

    console.info("login started");
    setLoading(true);
    resetFormErrors();
    setStatusMessage("Signing you in...");
    setShowExpiredMessage(false);

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
        setStatusMessage("");

        if (response.status === 429) {
          const retryAfterHeader = Number(response.headers.get("Retry-After") || "0");
          const retryAfterBody = Number((data as { retryAfter?: number } | null)?.retryAfter || 0);
          const retryAfter = retryAfterHeader || retryAfterBody || 30;
          startCooldown(retryAfter);
          return;
        }

        setError(resolveLoginError(data?.error, response.status));
        return;
      }

      if (data.success) {
        clearCooldown();
        console.info("supabase auth success");
        setStatusMessage("Signed in. Redirecting to your workspace...");
        setStoredSessionMode(rememberMe ? "persistent" : "temporary");

        await establishAuthenticatedSession({
          user: data.user,
          profile: data.profile ?? null,
          sessionToken: data.sessionToken,
          refreshToken: data.refreshToken,
        });

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
      setStatusMessage("");
      setError(
        isAbort
          ? "Sign-in timed out. Please try again."
          : "Network error. Check your connection and try again.",
      );
    } finally {
      if (!redirectAttempted && fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      setLoading(false);
      console.info("login finished");
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_52%),linear-gradient(180deg,rgba(15,23,42,0.32),rgba(2,6,23,0))]" />

      <div className="w-full max-w-md">
        <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/88 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur md:p-8">
          <div className="mb-6 text-center">
            <div className="inline-flex rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
              Secure sign in
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white">Welcome back</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400 md:text-base">
              Sign in to continue to your Smart Reply Pro workspace and pick up your reply strategy where you left off.
            </p>
          </div>

          {showExpiredMessage && !error ? (
            <div className="mb-4 rounded-xl border border-amber-700/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
              Your session expired. Please sign in again.
            </div>
          ) : null}

          {showResetSuccessMessage && !error ? (
            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
              Password updated successfully. Sign in with your new password.
            </div>
          ) : null}

          {showVerifiedMessage && !error ? (
            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
              Email verified successfully. You can now sign in.
            </div>
          ) : null}

          {isCooldownActive ? (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
              Too many failed attempts. Try again in <span className="font-semibold text-amber-200">{cooldownSecondsLeft}s</span>.
            </div>
          ) : null}

          {error && !isCooldownActive ? (
            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          {statusMessage && !error ? (
            <div className="mb-4 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
              {statusMessage}
            </div>
          ) : null}

          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError || error) {
                    setEmailError("");
                    setError("");
                  }
                }}
                disabled={loading || isCooldownActive}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? "login-email-error" : undefined}
                className={`h-12 w-full rounded-xl border bg-slate-950 px-4 text-base text-white placeholder:text-slate-500 transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                  emailError
                    ? "border-rose-500/60 focus:border-rose-400"
                    : "border-slate-700 focus:border-sky-400"
                }`}
                autoComplete="email"
                required
              />
              {emailError ? (
                <p id="login-email-error" className="mt-2 text-sm text-rose-300">
                  {emailError}
                </p>
              ) : null}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs font-medium text-sky-400 transition hover:text-sky-300">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError || error) {
                    setPasswordError("");
                    setError("");
                  }
                }}
                disabled={loading || isCooldownActive}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? "login-password-error" : undefined}
                className={`h-12 w-full rounded-xl border bg-slate-950 px-4 text-base text-white placeholder:text-slate-500 transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                  passwordError
                    ? "border-rose-500/60 focus:border-rose-400"
                    : "border-slate-700 focus:border-sky-400"
                }`}
                autoComplete="current-password"
                required
              />
              {passwordError ? (
                <p id="login-password-error" className="mt-2 text-sm text-rose-300">
                  {passwordError}
                </p>
              ) : null}
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading || isCooldownActive}
                className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-500 focus:ring-sky-500"
              />
              <span>Remember me</span>
            </label>

            <button
              type="submit"
              disabled={loading || isCooldownActive}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-sky-400 px-4 text-base font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/40 border-t-slate-950" />
                  Signing in...
                </span>
              ) : isCooldownActive ? (
                `Try again in ${cooldownSecondsLeft}s`
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-sky-400 transition hover:text-sky-300">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
