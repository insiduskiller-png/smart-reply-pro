"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import ProWaitlistForm from "@/components/pro-waitlist-form";
import { trackPricingView, trackUpgradeClick } from "@/lib/analytics";

function PricingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    trackPricingView().catch((error) => {
      console.debug("Failed to track pricing view:", error);
    });
  }, []);

  function handleFreePlanClick() {
    if (loading) return;
    router.push(user ? "/dashboard" : "/register");
  }

  function handleWaitlistClick() {
    trackUpgradeClick(user ? "free_waitlist_existing_user" : "free_waitlist_public").catch((error) => {
      console.debug("Failed to track waitlist click:", error);
    });
  }

  return (
    <main className="relative overflow-hidden bg-slate-950">
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_55%),linear-gradient(180deg,rgba(15,23,42,0.35),rgba(2,6,23,0))]" />

      <section className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:px-6 md:pb-14 md:pt-18">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
            Free is live now
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white md:text-6xl">
            Write better replies in seconds.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
            The Smart Reply Pro you've been waiting for is here. Free plan is fully functional today. Premium features launching next.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-left">
            <p className="text-sm font-semibold text-white">Ready to use in seconds</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">Sign up free, no payment method needed. Start crafting strategic replies immediately.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-left">
            <p className="text-sm font-semibold text-white">Real features, real results</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">Unlimited generations, tone control, and AI-learned personalization. This is the product.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-left">
            <p className="text-sm font-semibold text-white">Premium coming next</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">Join the waitlist for Pro features and priority access when they launch.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-slate-700 bg-white p-7 text-slate-950 shadow-[0_18px_60px_rgba(15,23,42,0.26)] md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Available today</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Free</h2>
              </div>
              <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                Live now
              </div>
            </div>

            <p className="mt-5 text-4xl font-semibold tracking-tight text-slate-950">
              €0 <span className="text-lg font-medium text-slate-500">/ month</span>
            </p>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
              Everything you need to start writing smarter replies. Unlimited generations, AI personalization, and tone control included.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span className="font-medium">Unlimited reply generations</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span>Multiple tone options (Neutral, Calm, Assertive, and more)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span>1 Reply Profile with AI-learned personalization</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span>Context-aware reply generation with strategic framing</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span>Real-time style learning from your message history</span>
              </li>
            </ul>

            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={handleFreePlanClick}
                disabled={loading}
                className="flex h-12 w-full items-center justify-center rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {user ? "Open Dashboard" : "Start Free Now"}
              </button>
              <p className="text-center text-xs text-slate-500">
                No credit card required. Instant access.
              </p>
            </div>
          </article>

          <article className="rounded-[2rem] border border-sky-500/30 bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(15,23,42,0.82))] p-7 text-white shadow-[0_18px_60px_rgba(8,47,73,0.28)] md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-200">Coming next</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">Pro</h2>
              </div>
              <div className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">
                Join Waitlist
              </div>
            </div>

            <p className="mt-5 text-2xl font-semibold tracking-tight">More profiles, more control, more power.</p>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
              Advanced personalization, additional tone options, and priority tools for power users who need maximum strategic control.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-slate-200">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-sky-300">•</span>
                <span><span className="font-medium">Up to 5 Reply Profiles</span> for different people, platforms, and tones</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-sky-300">•</span>
                <span><span className="font-medium">Extended tone library</span> with specialized modes for negotiation, persuasion, and more</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-sky-300">•</span>
                <span><span className="font-medium">Advanced context handling</span> and deeper personalization from learned patterns</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-sky-300">•</span>
                <span><span className="font-medium">Priority access</span> to new tools, features, and model improvements</span>
              </li>
            </ul>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="flex h-12 items-center justify-center rounded-md border border-slate-600 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-slate-400"
              >
                Checkout Disabled
              </button>
              <Link
                href="#pro-waitlist"
                className="flex h-12 items-center justify-center rounded-md bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                onClick={handleWaitlistClick}
              >
                Join Waitlist
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Join now to be notified first when Pro launches, and get priority access to the paid experience.
            </p>
          </article>
        </div>
      </section>

      <section id="pro-waitlist" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-6 sm:px-6 md:py-8">
        <ProWaitlistForm
          title="Get early access to Smart Reply Pro."
          description="Join the waitlist now. Be first to know when Pro launches, and gain priority access to the premium tier."
          sourcePage="/pricing"
          submitLabel="Join Waitlist"
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr] md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">Honest pricing model</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Free now. Pro arrives with real value, not false urgency.
              </h3>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
                Smart Reply Pro is live and fully functional in Free mode today. Pro is coming as a separate, intentional release—no broken checkout, no artificial pressure, just a real premium experience when it's ready.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm font-semibold text-white">Trustworthy by default</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">What you see is what exists. Free plan is complete today. Upgrade path will be clear when Pro is ready.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm font-semibold text-white">Strategic advantage</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Start now with unlimited Free features. Upgrade to Pro when advanced profiles and tone control become essential.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default PricingPage;
