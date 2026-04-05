"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import ProWaitlistForm from "@/components/pro-waitlist-form";
import { trackPricingView, trackUpgradeClick } from "@/lib/analytics";

export default function PricingPage() {
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
            Public launch live
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white md:text-6xl">
            Start using Smart Reply Pro free today.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
            The public launch is live in Free mode now. Pro is intentionally scheduled for a future release while we finish the next tier the right way.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-left">
            <p className="text-sm font-semibold text-white">Free is fully available</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">Create an account and start generating strategic replies immediately.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-left">
            <p className="text-sm font-semibold text-white">Built for public launch</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">The current experience is intentional, polished, and ready to use without any unfinished purchase flow.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-left">
            <p className="text-sm font-semibold text-white">Pro is preparing next</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">Join the waitlist now and get notified when advanced tiers are released.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-slate-700 bg-white p-7 text-slate-950 shadow-[0_18px_60px_rgba(15,23,42,0.26)] md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Available now</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Free</h2>
              </div>
              <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                Public launch
              </div>
            </div>

            <p className="mt-5 text-4xl font-semibold tracking-tight text-slate-950">
              €0 <span className="text-lg font-medium text-slate-500">/ month</span>
            </p>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
              A complete free entry point for real users who want strategic, tone-aware replies without waiting for the next tier.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span>Unlimited reply generations during the public launch</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span>1 active Reply Profile for focused personalization</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span>Style learning from your past messages</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span>Context-aware replies with strategic tone control</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span>Core modes including Neutral, Calm, and Assertive</span>
              </li>
            </ul>

            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={handleFreePlanClick}
                disabled={loading}
                className="flex h-12 w-full items-center justify-center rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {user ? "Open Free Workspace" : "Start Free"}
              </button>
              <p className="text-sm text-slate-500">
                Smart Reply Pro is publicly available in free mode right now.
              </p>
            </div>
          </article>

          <article className="rounded-[2rem] border border-sky-500/30 bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(15,23,42,0.82))] p-7 text-white shadow-[0_18px_60px_rgba(8,47,73,0.28)] md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-200">Future release</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">Pro</h2>
              </div>
              <div className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">
                Next Release
              </div>
            </div>

            <p className="mt-5 text-2xl font-semibold tracking-tight">Pro is being prepared now.</p>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
              We are intentionally delaying Pro until the premium tier is ready for a clean release. It is not purchasable yet, and checkout is currently disabled by design.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-slate-200">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-sky-300">•</span>
                <span>More Reply Profiles for multiple people and contexts</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-sky-300">•</span>
                <span>More advanced rewrite directions and strategic framing options</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-sky-300">•</span>
                <span>Higher-tier personalization and stronger context handling</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-sky-300">•</span>
                <span>Priority access to future premium reply tools</span>
              </li>
            </ul>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="flex h-12 items-center justify-center rounded-md border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm font-semibold text-slate-300"
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
            <Link
              href="#pro-waitlist"
              className="mt-3 inline-flex text-sm font-medium text-sky-200 transition hover:text-sky-100"
              onClick={handleWaitlistClick}
            >
              Notify Me
            </Link>
          </article>
        </div>
      </section>

      <section id="pro-waitlist" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-6 sm:px-6 md:py-8">
        <ProWaitlistForm
          title="Join the list before Pro opens for paid launch."
          description="Register your interest now, share how you want to use Pro, and we’ll notify early interest first when the premium tier is ready."
          sourcePage="/pricing"
          submitLabel="Join Waitlist"
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr] md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">Launch status</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Free is live now. Pro arrives later as a separate release.
              </h3>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
                This page reflects the current product exactly: Smart Reply Pro is publicly available in Free mode today, and Pro is being prepared for a future launch with intentional rollout timing.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm font-semibold text-white">Trustworthy by design</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">No hidden purchase flow, no broken checkout, and no contradictory upgrade language.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm font-semibold text-white">Clear upgrade path later</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">When Pro is ready, waitlist users can be notified first and upgraded through a proper release flow.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
