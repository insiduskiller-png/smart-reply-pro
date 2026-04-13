"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

function extractAccessToken() {
  if (typeof window === "undefined") return "";
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);
  const authType = hashParams.get("type") || queryParams.get("type") || "";
  if (authType !== "recovery") return "";

  const fromHash = hashParams.get("access_token");
  const fromQuery = queryParams.get("access_token");
  return fromHash || fromQuery || "";
}

function extractAuthCode() {
  if (typeof window === "undefined") return "";
  const queryParams = new URLSearchParams(window.location.search);
  return queryParams.get("code") || "";
}

function isRecoveryFlow() {
  if (typeof window === "undefined") return false;
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);
  return (hashParams.get("type") || queryParams.get("type") || "") === "recovery";
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [tokenResolved, setTokenResolved] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function resolveResetToken() {
      if (!isRecoveryFlow()) {
        setError("Reset session not found. Please use the latest reset link from your email.");
        setTokenResolved(true);
        return;
      }

      const tokenFromUrl = extractAccessToken();
      if (tokenFromUrl) {
        setAccessToken(tokenFromUrl);
        setTokenResolved(true);
        return;
      }

      const authCode = extractAuthCode();
      if (authCode) {
        const { data, error: exchangeError } = await supabaseBrowser.auth.exchangeCodeForSession(authCode);

        if (!exchangeError && data.session?.access_token) {
          setAccessToken(data.session.access_token);
          setTokenResolved(true);
          return;
        }
      }

      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (session?.access_token) {
        setAccessToken(session.access_token);
        setTokenResolved(true);
        return;
      }

      setError("Reset session not found. Please use the latest reset link from your email.");
      setTokenResolved(true);
    }

    void resolveResetToken();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, password }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error || "Unable to reset password.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login?reset=success");
        router.refresh();
      }, 1400);
    } catch {
      setError("Reset request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_52%),linear-gradient(180deg,rgba(15,23,42,0.32),rgba(2,6,23,0))]" />

      <div className="w-full max-w-md">
        <form className="rounded-[1.75rem] border border-slate-800 bg-slate-900/88 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur md:p-8" onSubmit={onSubmit}>
          <div className="mb-6 text-center">
            <div className="inline-flex rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
              Secure recovery
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white">Set a new password</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400 md:text-base">
              Choose a strong new password for your Smart Reply Pro account.
            </p>
          </div>

          {!tokenResolved ? (
            <div className="mb-4 rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
              Verifying your reset link...
            </div>
          ) : null}

          {tokenResolved && !accessToken && !error ? (
            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
              Reset session not found. Please request a new password reset link.
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
              Password updated. Redirecting to sign in...
            </div>
          ) : null}

          <div className="space-y-4">
            <div>
              <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-slate-200">
                New password
              </label>
              <input
                id="new-password"
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-white placeholder:text-slate-500 transition focus:border-sky-400 focus:outline-none"
                type="password"
                placeholder="Enter a new password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading || success || !accessToken}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-slate-200">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-white placeholder:text-slate-500 transition focus:border-sky-400 focus:outline-none"
                type="password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={loading || success || !accessToken}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <button
              className="flex h-12 w-full items-center justify-center rounded-xl bg-sky-400 px-4 text-base font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              type="submit"
              disabled={loading || success || !accessToken}
            >
              {loading ? "Updating password..." : "Update password"}
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-slate-400">
            Need a new link?{" "}
            <Link href="/forgot-password" className="font-medium text-sky-400 transition hover:text-sky-300">
              Request password reset
            </Link>
          </div>

          <div className="mt-3 text-center text-sm text-slate-400">
            Need help? Contact <a href="mailto:support@smartreplypro.ai" className="font-medium text-sky-400 transition hover:text-sky-300">support@smartreplypro.ai</a>
          </div>
        </form>
      </div>
    </main>
  );
}
