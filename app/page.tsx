"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProWaitlistForm from "@/components/pro-waitlist-form";
import { trackHomepageVisit } from "@/lib/analytics";
import { useAuth } from "@/components/auth-provider";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    trackHomepageVisit().catch((error) => {
      console.debug("Failed to track homepage visit:", error);
    });
  }, []);

  const primaryCtaLabel = user ? "Open Dashboard" : redirecting ? "Redirecting..." : "Start Free Now";
  const primaryCtaSubtext = user
    ? "Go straight to your workspace and keep building better replies."
    : "";

  function handlePrimaryAction() {
    if (loading || redirecting) {
      return;
    }

    setRedirecting(true);
    router.push(user ? "/dashboard" : "/register");
  }

  return (
    <main className="relative overflow-hidden bg-slate-950">
      <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_20%_30%,rgba(14,165,233,0.12),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.35),rgba(2,6,23,0))]" />

      <section className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 md:pb-20 md:pt-20">
        <div className="grid items-start gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
          <div>
            <div className="inline-flex items-center rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-sky-200">
              Strategic AI for replies
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
              Don’t send it yet.
              <br className="hidden sm:block" />
              <span className="sm:block">Control how your conversation ends.</span>
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
              Smart Reply Pro is purpose-built for reply strategy. It reads tone, emotional pressure, and social context so your message lands with clarity, confidence, and leverage.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md bg-sky-400 px-6 py-3.5 text-base font-semibold text-slate-950 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handlePrimaryAction}
                disabled={redirecting || loading}
              >
                {primaryCtaLabel}
              </button>

              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900/70 px-6 py-3.5 text-base font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900"
              >
                View Pricing
              </Link>
            </div>

            <p className="mt-3 text-sm text-slate-400">
              {user ? primaryCtaSubtext : "Free is live now. Pro launches soon."}
            </p>
          </div>

          <div className="relative">
            <div className="absolute -right-20 -top-14 -z-10 h-56 w-56 rounded-full bg-sky-400/12 blur-3xl" />
            <div className="absolute -bottom-14 -left-10 -z-10 h-40 w-40 rounded-full bg-indigo-400/10 blur-3xl" />

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-sm font-semibold text-white">Built for strategic communication</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Built for high-stakes replies across dating, work, and personal conversations.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-sm font-semibold text-white">Specialized beyond general AI</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Purpose-trained for tone reading, emotional intelligence, and socially aware wording.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-sm font-semibold text-white">Fast path to action</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Paste a message, choose your goal, and get refined reply options in seconds.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-900/65 p-6 md:p-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">Why it’s better</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Specialized AI beats general chat when the reply actually matters.
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
              <p className="text-base font-semibold text-white">Built for replies, not general chat</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Smart Reply Pro focuses on one job: turning incoming messages into strategic responses you can actually send.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
              <p className="text-base font-semibold text-white">Reads tone, pressure, and social dynamics</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                It looks beyond the words to detect urgency, emotional pressure, and intent before suggesting how to answer.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
              <p className="text-base font-semibold text-white">Produces sharper replies faster</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                You get cleaner framing, stronger rewrites, and more usable options than generic AI prompts and guesswork.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 md:py-24">
        {/* Editorial header */}
        <div className="mb-14 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">How it works</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Four steps from incoming message<br className="hidden sm:block" /> to a smarter reply.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-400 md:text-base">
            Fast enough for real conversations. Structured enough to give you better strategic options before you hit send.
          </p>
        </div>

        {/* Step cards — horizontal flow */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {/* Step 1 */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900/60 px-6 py-7 shadow-[0_1px_2px_rgba(0,0,0,0.4)] ring-1 ring-inset ring-white/[0.04] transition-shadow duration-300 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.12),0_8px_32px_rgba(0,0,0,0.45)]">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-400/20 bg-sky-400/[0.07] text-sm font-semibold text-sky-300">1</div>
            <p className="mt-5 text-[0.9375rem] font-semibold leading-snug tracking-tight text-white">Create your profile</p>
            <p className="mt-3 text-sm leading-[1.7] text-slate-400/90">
              Set your tone, preferences, and communication style so the AI can generate replies that feel more natural, more authentic, and more like you.
            </p>
          </div>

          {/* Step 2 */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900/60 px-6 py-7 shadow-[0_1px_2px_rgba(0,0,0,0.4)] ring-1 ring-inset ring-white/[0.04] transition-shadow duration-300 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.12),0_8px_32px_rgba(0,0,0,0.45)]">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-400/20 bg-sky-400/[0.07] text-sm font-semibold text-sky-300">2</div>
            <p className="mt-5 text-[0.9375rem] font-semibold leading-snug tracking-tight text-white">Paste the message</p>
            <p className="mt-3 text-sm leading-[1.7] text-slate-400/90">
              Drop in the exact text so the AI can assess what is being said and what is being implied.
            </p>
          </div>

          {/* Step 3 */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900/60 px-6 py-7 shadow-[0_1px_2px_rgba(0,0,0,0.4)] ring-1 ring-inset ring-white/[0.04] transition-shadow duration-300 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.12),0_8px_32px_rgba(0,0,0,0.45)]">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-400/20 bg-sky-400/[0.07] text-sm font-semibold text-sky-300">3</div>
            <p className="mt-5 text-[0.9375rem] font-semibold leading-snug tracking-tight text-white">Choose the style or goal</p>
            <p className="mt-3 text-sm leading-[1.7] text-slate-400/90">
              Tell it whether you want calm, firm, warm, detached, boundary-setting, or strategically neutral.
            </p>
          </div>

          {/* Step 4 */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900/60 px-6 py-7 shadow-[0_1px_2px_rgba(0,0,0,0.4)] ring-1 ring-inset ring-white/[0.04] transition-shadow duration-300 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.12),0_8px_32px_rgba(0,0,0,0.45)]">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-400/20 bg-sky-400/[0.07] text-sm font-semibold text-sky-300">4</div>
            <p className="mt-5 text-[0.9375rem] font-semibold leading-snug tracking-tight text-white">Get strategic replies instantly</p>
            <p className="mt-3 text-sm leading-[1.7] text-slate-400/90">
              Review polished reply options and refine them directly in the same reply box until the message feels right for you.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
        <div className="rounded-[2rem] border border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(15,23,42,0.62))] p-6 md:p-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">Why the AI feels advanced</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Designed to understand the strategy behind the message, not just the words.
            </h2>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
              <p className="text-sm font-semibold text-white">Tone analysis</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">Reads whether a message is warm, defensive, urgent, passive, or confrontational.</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
              <p className="text-sm font-semibold text-white">Emotional pressure detection</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">Flags urgency, guilt, leverage, and subtle pressure that generic AI often misses.</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
              <p className="text-sm font-semibold text-white">Reply framing</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">Shapes the answer to preserve confidence, clarity, and the right balance of openness.</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
              <p className="text-sm font-semibold text-white">Stronger rewrite options</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">Generates multiple polished directions instead of one generic response that still needs work.</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
              <p className="text-sm font-semibold text-white">Context-aware suggestions</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">Adjusts to the social situation so the reply feels accurate, intentional, and human.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 md:pb-24">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-sky-400/20 bg-sky-400/10 px-6 py-8 md:px-10 md:py-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-200">Ready to start?</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Get your first strategic reply in 30 seconds.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
              Paste an incoming message, choose your tone, and get multiple sharper reply options—no setup, no guessing.
            </p>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md bg-sky-400 px-6 py-3.5 text-base font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handlePrimaryAction}
                disabled={redirecting || loading}
              >
                {primaryCtaLabel}
              </button>
              {!user ? (
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-950/60 px-6 py-3.5 text-base font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-950"
                >
                  View Pricing
                </Link>
              ) : null}
            </div>
            {!user && (
              <p className="mt-3 text-sm text-sky-100">Free is live now. Pro launches soon.</p>
            )}
          </div>

          <ProWaitlistForm
            title="Want first access when Pro launches?"
            description="Free is live now. If you want premium features later, join the early-interest list and tell us what you need most."
            sourcePage="/"
            submitLabel="Notify Me"
            compact
          />
        </div>
      </section>
    </main>
  );
}
