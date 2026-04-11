"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { trackUpgradeClick, trackEvent } from "@/lib/analytics";
import { useAuth } from "@/components/auth-provider";

type ProWaitlistFormProps = {
  title: string;
  description: string;
  sourcePage?: string;
  submitLabel?: string;
  compact?: boolean;
  className?: string;
};

type SubmitState =
  | { status: "idle"; message?: undefined }
  | { status: "submitting"; message?: undefined }
  | { status: "success"; message: string; duplicate: boolean }
  | { status: "warning"; message: string }
  | { status: "error"; message: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ProWaitlistForm({
  title,
  description,
  sourcePage,
  submitLabel = "Join Waitlist",
  compact = false,
  className = "",
}: ProWaitlistFormProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const resolvedSourcePage = sourcePage ?? pathname ?? "/";
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  useEffect(() => {
    if (!email && user?.email) {
      setEmail(user.email);
    }
  }, [email, user?.email]);

  const emailIsValid = useMemo(() => EMAIL_REGEX.test(email.trim().toLowerCase()), [email]);
  const isSubmitting = submitState.status === "submitting";
  const hasSuccess = submitState.status === "success";
  const hasWarning = submitState.status === "warning";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    console.info("[pro-waitlist-ui]", {
      stage: "submit-reached",
      sourcePage: resolvedSourcePage,
      hasEmail: Boolean(email.trim()),
      noteLength: note.length,
    });

    if (!email.trim()) {
      setSubmitState({ status: "error", message: "Enter your email to join the Pro waitlist." });
      return;
    }

    if (!emailIsValid) {
      setSubmitState({ status: "error", message: "Enter a valid email address." });
      return;
    }

    setSubmitState({ status: "submitting" });

    try {
      trackUpgradeClick(`waitlist_form_${resolvedSourcePage}`).catch(() => undefined);

      const requestPayload = {
        email,
        note,
        sourcePage: resolvedSourcePage,
      };

      console.info("[pro-waitlist-ui]", {
        stage: "submit-payload",
        payload: {
          ...requestPayload,
          noteLength: note.length,
        },
      });

      const response = await fetch("/api/pro-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; saved?: boolean; duplicate?: boolean; message?: string; errorCode?: string }
        | null;

      console.info("[pro-waitlist-ui]", {
        stage: "submit-response",
        status: response.status,
        payload,
      });

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to join the waitlist right now.");
      }

      if (payload?.saved && payload.success === false) {
        setSubmitState({
          status: "warning",
          message: payload.message || "You’re on the Pro waitlist. We saved your request, but internal notification is delayed.",
        });
        setNote("");
        return;
      }

      if (!payload?.success) {
        throw new Error(payload?.message || "Unable to join the waitlist right now.");
      }

      const duplicate = Boolean(payload.duplicate);
      const message =
        payload.message ||
        (duplicate
          ? "You’re already on the Pro waitlist. We’ll notify you when access opens."
          : "You’re on the Pro waitlist. We’ll notify you when access opens.");

      setSubmitState({ status: "success", message, duplicate });
      setNote("");

      trackEvent("upgrade_clicked", {
        action: duplicate ? "waitlist_duplicate" : "waitlist_joined",
        sourcePage: resolvedSourcePage,
      }).catch(() => undefined);
    } catch (error) {
      setSubmitState({
        status: "error",
        message: error instanceof Error ? error.message : "Unable to join the waitlist right now.",
      });
    }
  }

  return (
    <div className={`rounded-[2rem] border border-sky-400/20 bg-slate-950/70 p-6 shadow-[0_18px_60px_rgba(2,6,23,0.32)] backdrop-blur md:p-8 ${className}`.trim()}>
      {hasSuccess ? (
        <div className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 p-6 text-left">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400/15 text-lg text-emerald-200">✓</div>
          <h3 className="mt-4 text-xl font-semibold text-white">
            {submitState.duplicate ? "Already on the Pro waitlist" : "You’re on the Pro waitlist"}
          </h3>
          <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/90">{submitState.message}</p>
          <p className="mt-2 text-sm text-slate-300">
            We’ll reach out at <span className="font-semibold text-white">{email.trim().toLowerCase()}</span> when Pro is ready.
          </p>
        </div>
      ) : hasWarning ? (
        <div className="rounded-[1.5rem] border border-amber-400/20 bg-amber-400/10 p-6 text-left">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-amber-400/15 text-lg text-amber-200">!</div>
          <h3 className="mt-4 text-xl font-semibold text-white">Request saved</h3>
          <p className="mt-3 max-w-xl text-sm leading-6 text-amber-50/90">{submitState.message}</p>
          <p className="mt-2 text-sm text-slate-300">
            We saved your request for <span className="font-semibold text-white">{email.trim().toLowerCase()}</span>.
          </p>
        </div>
      ) : (
        <>
          <div className={compact ? "max-w-xl" : "max-w-2xl"}>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">Pro waitlist</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300 md:text-base">{description}</p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className={compact ? "grid gap-4" : "grid gap-4 md:grid-cols-[1fr_1fr]"}>
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Email</span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                  disabled={isSubmitting}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Note or use case (optional)</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, 1000))}
                  placeholder="Tell us where you want Pro to help most."
                  className={`w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none ${compact ? "min-h-[110px]" : "min-h-[120px]"}`}
                  disabled={isSubmitting}
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-400">
                {submitState.status === "error" ? (
                  <span className="text-rose-300">{submitState.message}</span>
                ) : (
                  <span>We store your email and source page so we can prioritize the Pro launch rollout.</span>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 items-center justify-center rounded-md bg-sky-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Joining..." : submitLabel}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
