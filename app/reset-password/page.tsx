"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function extractAccessToken() {
  if (typeof window === "undefined") return "";
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("access_token");
  const fromQuery = new URLSearchParams(window.location.search).get("access_token");
  return fromHash || fromQuery || "";
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = extractAccessToken();
    if (!token) {
      setError("Reset session not found. Please use the latest reset link from your email.");
      return;
    }
    setAccessToken(token);
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
        router.push("/login");
        router.refresh();
      }, 1400);
    } catch {
      setError("Reset request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <form className="card space-y-4 p-6" onSubmit={onSubmit}>
        <h1 className="text-2xl font-semibold">Set new password</h1>
        <p className="text-sm text-slate-300">Use a strong password with at least 8 characters.</p>
        <input
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          type="password"
          placeholder="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <input
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-400">Password updated. Redirecting to login…</p> : null}
        <button
          className="w-full rounded-md bg-sky-500 px-3 py-2 font-medium text-slate-950 disabled:opacity-60"
          type="submit"
          disabled={loading || !accessToken}
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </main>
  );
}
