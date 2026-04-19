"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

type FeedbackState = "idle" | "submitting" | "success" | "error";

interface FeedbackPopupProps {
  /** Called after the popup is dismissed (X clicked, not submitted). */
  onDismiss?: () => void;
  /** Called after feedback is successfully submitted. */
  onSubmitted?: () => void;
}

/**
 * Premium feedback popup — shown once after the user reaches the generation
 * threshold. Appears in the bottom-right corner of the screen.
 *
 * Visibility logic is controlled by the parent (DashboardClient).
 * This component handles its own internal form/state only.
 */
export default function FeedbackPopup({ onDismiss, onSubmitted }: FeedbackPopupProps) {
  const [feedback, setFeedback] = useState("");
  const [state, setState] = useState<FeedbackState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);

  // Focus the textarea when the popup mounts for a smooth UX.
  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  async function handleDismiss() {
    try {
      await fetch("/api/feedback/dismiss", { method: "POST" });
    } catch {
      // Non-fatal — dismiss state is stored server-side but UI should still close.
    }
    onDismiss?.();
  }

  async function handleSubmit() {
    if (!feedback.trim() || submittingRef.current) return;

    submittingRef.current = true;
    setState("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback.trim(), source: "popup" }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      setState("success");
      setTimeout(() => {
        onSubmitted?.();
      }, 2200);
    } catch (err) {
      setState("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      submittingRef.current = false;
    }
  }

  return (
    // Overlay blocker removed intentionally — popup is non-modal.
    <div
      role="dialog"
      aria-labelledby="feedback-popup-title"
      aria-modal="false"
      className="fixed bottom-6 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0d1626] shadow-[0_24px_64px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)]">
        {/* Gradient top accent */}
        <div className="h-[2px] w-full bg-gradient-to-r from-[#ff9b54] via-[#8b7bff] to-[#54d1ff]" />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <Image
              src="/srp-logo.png"
              width={28}
              height={28}
              alt="SmartReplyPro"
              className="rounded-md"
            />
            <div>
              <p id="feedback-popup-title" className="text-sm font-bold leading-tight text-slate-100">
                Enjoying SmartReplyPro?
              </p>
              <p className="mt-0.5 text-xs leading-snug text-slate-400">
                We'd love to hear what you think so far.
              </p>
            </div>
          </div>
          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close feedback"
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-700/60 hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-5">
          {state === "success" ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M4 10l4.5 4.5L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-100">Thank you for your feedback!</p>
              <p className="text-xs text-slate-400">We really appreciate you taking the time.</p>
            </div>
          ) : (
            <>
              <textarea
                ref={textareaRef}
                value={feedback}
                onChange={(e) => {
                  setFeedback(e.target.value);
                  if (state === "error") {
                    setState("idle");
                    setErrorMessage("");
                  }
                }}
                disabled={state === "submitting"}
                placeholder={`How is your experience so far?\nIs there anything we could improve?`}
                rows={4}
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900/70 px-3.5 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-sky-500/70 focus:ring-1 focus:ring-sky-500/40 disabled:opacity-60"
              />

              {state === "error" && errorMessage && (
                <p className="mt-2 text-xs text-rose-400">{errorMessage}</p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!feedback.trim() || state === "submitting"}
                className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#58b8d9] to-[#6f69df] text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                {state === "submitting" ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Sending…
                  </>
                ) : (
                  "Send Feedback"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
