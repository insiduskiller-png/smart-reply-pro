/**
 * /feedback page
 *
 * Standalone branded feedback page — used as the CTA destination
 * from inactivity emails. Accepts ?source=inactive_email query param.
 *
 * Works for both authenticated and unauthenticated users arriving
 * from the email link (auth is handled server-side in the API route).
 */

"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type SubmitState = "idle" | "submitting" | "success" | "error";

function FeedbackForm() {
  const searchParams = useSearchParams();
  const source = searchParams.get("source") ?? "web";

  const [feedback, setFeedback] = useState("");
  const [state, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const submittingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedback.trim() || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitState("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback.trim(), source }),
      });

      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        // Not logged in — redirect to login and come back
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      setSubmitState("success");
    } catch (err) {
      setSubmitState("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      submittingRef.current = false;
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0d1626] shadow-[0_24px_64px_rgba(0,0,0,0.55)]">
          {/* Top accent */}
          <div className="h-[2px] w-full bg-gradient-to-r from-[#ff9b54] via-[#8b7bff] to-[#54d1ff]" />

          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-700/60 px-6 py-5 bg-gradient-to-r from-[#121c31] via-[#11243d] to-[#13365d]">
            <Image
              src="/srp-logo.png"
              width={36}
              height={36}
              alt="SmartReplyPro"
              className="rounded-md"
            />
            <div>
              <span className="text-base font-bold text-slate-100 tracking-tight">Smart Reply </span>
              <span className="text-base font-bold text-[#74C6FF] tracking-tight">Pro</span>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-8">
            {state === "success" ? (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                    <path d="M5 14l6 6 12-12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-100">Thank you!</h1>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    Your feedback means a lot to us. We read every message and use it to make SmartReplyPro better.
                  </p>
                </div>
                <Link
                  href="/dashboard"
                  className="mt-2 inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#58b8d9] to-[#6f69df] px-6 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
                >
                  Back to dashboard
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <h1 className="text-xl font-bold leading-tight text-slate-100 mb-1">
                  How can we improve?
                </h1>
                <p className="text-sm leading-relaxed text-slate-400 mb-6">
                  We'd love to hear what you think — any issues, ideas, or suggestions are welcome.
                </p>

                <label htmlFor="feedback-textarea" className="sr-only">
                  Your feedback
                </label>
                <textarea
                  id="feedback-textarea"
                  ref={textareaRef}
                  value={feedback}
                  onChange={(e) => {
                    setFeedback(e.target.value);
                    if (state === "error") {
                      setSubmitState("idle");
                      setErrorMessage("");
                    }
                  }}
                  disabled={state === "submitting"}
                  placeholder={`How is your experience so far?\nIs there anything we could improve?`}
                  rows={6}
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-sky-500/70 focus:ring-1 focus:ring-sky-500/40 disabled:opacity-60"
                />

                {state === "error" && errorMessage && (
                  <p className="mt-2 text-xs text-rose-400">{errorMessage}</p>
                )}

                <button
                  type="submit"
                  disabled={!feedback.trim() || state === "submitting"}
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#58b8d9] to-[#6f69df] text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  {state === "submitting" ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Sending…
                    </>
                  ) : (
                    "Send Feedback"
                  )}
                </button>

                <p className="mt-5 text-center text-xs text-slate-500">
                  You can also reach us at{" "}
                  <a
                    href="mailto:support@smartreplypro.ai"
                    className="text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    support@smartreplypro.ai
                  </a>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[70vh] items-center justify-center"><span className="text-slate-400 text-sm">Loading…</span></div>}>
      <FeedbackForm />
    </Suspense>
  );
}
