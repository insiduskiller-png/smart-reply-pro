"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function PricingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        setIsLoggedIn(response.ok);
      } catch {
        setIsLoggedIn(false);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, []);

  const freePlanHref = isLoggedIn ? "/dashboard" : "/register";

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-16">
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold leading-tight md:text-5xl">
          Stop guessing what to say. Start controlling the outcome.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 md:text-lg">
          Smart Reply Pro learns how you communicate and helps you respond with clarity, confidence, and
          strategy — in real time.
        </p>

        <ul className="mx-auto mt-6 max-w-2xl space-y-2 text-left text-sm text-slate-200 md:text-base">
          <li className="flex items-start gap-3">
            <span className="mt-1 text-sky-400">•</span>
            <span>Replies that sound like you — not like AI</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1 text-sky-400">•</span>
            <span>Understand tone, pressure, and intent before you respond</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1 text-sky-400">•</span>
            <span>Turn conversations into decisions, not reactions</span>
          </li>
        </ul>
      </section>

      <section className="mt-10 grid gap-4 md:mt-12 md:grid-cols-2 md:gap-6">
        <article className="card p-6">
          <h2 className="text-xl font-semibold">Free</h2>
          <p className="mt-2 text-2xl font-semibold text-white">€0 <span className="text-base font-medium text-slate-300">/ month</span></p>
          <p className="mt-2 text-sm text-slate-300">Personalized replies for one active person</p>

          <ul className="mt-5 space-y-2 text-sm text-slate-200">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">✓</span>
              <span>Unlimited reply generations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">✓</span>
              <span>1 active Reply Profile (AI adapts to one person)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">✓</span>
              <span>Style learning from your past messages</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">✓</span>
              <span>Context-aware replies</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">✓</span>
              <span>Basic strategy modes (Neutral, Calm, Assertive)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">✓</span>
              <span>Profile-based personalization</span>
            </li>
          </ul>

          <div className="mt-6">
            {checkingAuth ? (
              <div className="h-12 w-full rounded-md border border-slate-700 bg-slate-800/70 px-4 py-3 text-center text-sm font-medium text-slate-300">
                Loading...
              </div>
            ) : (
              <Link
                href={freePlanHref}
                className="flex h-12 w-full items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                Start Free
              </Link>
            )}
          </div>
        </article>

        <article className="card border-sky-500/70 bg-sky-950/20 p-6 shadow-[0_0_30px_rgba(56,189,248,0.12)]">
          <div className="mb-2 inline-block rounded-full border border-sky-400/60 bg-sky-400/15 px-3 py-1 text-xs font-semibold text-sky-300">
            Coming Soon
          </div>
          <h2 className="text-xl font-semibold">Pro</h2>
          <p className="mt-2 text-2xl font-semibold text-white">€5.50 <span className="text-base font-medium text-slate-300">/ month</span></p>
          <p className="mt-2 text-sm text-slate-200">Full conversation control across multiple people</p>

          <ul className="mt-5 space-y-2 text-sm text-slate-200">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">✓</span>
              <span>3 active Reply Profiles (different people, different styles)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">✓</span>
              <span>Advanced personalization engine (deeper adaptation over time)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">✓</span>
              <span>Multiple reply options (choose the best move)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">✓</span>
              <span>Strategic escalation tools (control direction of conversations)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">✓</span>
              <span>Enhanced strategy modes (Calm / Assertive / Strategic refined)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">✓</span>
              <span>Faster learning and higher consistency</span>
            </li>
          </ul>

          <button
            type="button"
            disabled
            aria-disabled="true"
            className="mt-6 h-12 w-full cursor-not-allowed rounded-md border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300"
          >
            Pro version coming soon
          </button>
        </article>
      </section>

      <p className="mt-6 text-center text-sm text-slate-300">
        Your conversations shape your opportunities. Choose how you show up.
      </p>

      <section className="mx-auto mt-12 max-w-3xl rounded-xl border border-slate-800 bg-slate-900/70 p-6 text-center md:mt-14 md:p-8">
        <h3 className="text-2xl font-semibold md:text-3xl">
          This isn’t about better replies. It’s about better outcomes.
        </h3>
        <p className="mt-3 text-sm text-slate-300 md:text-base">
          Most people respond emotionally and hope for the best. Smart Reply Pro helps you slow down,
          understand the situation, and respond with intent.
        </p>
      </section>
    </main>
  );
}
