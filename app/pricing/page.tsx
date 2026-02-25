"use client";

import Link from "next/link";
import { useState } from "react";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", { method: "POST" });
      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        window.location.href = "/login?next=/pricing";
        return;
      }

      if (!response.ok || !data?.url) {
        setError(data?.error || "Checkout failed. Please try again in a moment.");
        return;
      }

      window.location.assign(data.url);
    } catch {
      setError("Network error while creating checkout session.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-xl font-semibold">Free</h2>
          <p className="mt-2 text-slate-300">€0/month</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>5 generations/day</li>
            <li>Single output</li>
            <li>No power score</li>
          </ul>
        </section>
        <section className="card border-sky-500 p-6">
          <h2 className="text-xl font-semibold">Pro</h2>
          <p className="mt-2 text-slate-300">€12/month</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>Unlimited generations</li>
            <li>Power score engine</li>
            <li>3 response variants + escalation tools</li>
          </ul>
          <button
            className="mt-6 rounded-md bg-sky-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60"
            onClick={startCheckout}
            disabled={loading}
          >
            {loading ? "Redirecting..." : "Upgrade to Pro"}
          </button>
          {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
          <p className="mt-3 text-xs text-slate-400">
            Already have an account?{" "}
            <Link className="text-sky-400" href="/login">
              Log in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
