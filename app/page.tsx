"use client";

import { useEffect, useMemo, useState } from "react";
import { trackHomepageVisit } from "@/lib/analytics";

function analyzeMessage(message: string) {
  const text = message.toLowerCase();

  const toneDetected = text.includes("!") || text.includes("now") || text.includes("immediately")
    ? "Urgent"
    : text.includes("sorry") || text.includes("please") || text.includes("thank")
      ? "Soft / Diplomatic"
      : text.includes("why") || text.includes("never") || text.includes("always")
        ? "Defensive"
        : "Neutral";

  const pressureLevel = text.includes("deadline") || text.includes("today") || text.includes("asap") || text.includes("now")
    ? "High"
    : text.includes("soon") || text.includes("quick")
      ? "Medium"
      : "Low";

  const hiddenIntent = text.includes("just") || text.includes("simple") || text.includes("quick")
    ? "Minimizing effort while asking for commitment"
    : text.includes("everyone") || text.includes("team") || text.includes("others")
      ? "Social pressure framing"
      : text.includes("if you") || text.includes("unless")
        ? "Conditional leverage"
        : "Intent unclear — needs strategic framing";

  return { toneDetected, pressureLevel, hiddenIntent };
}

export default function Home() {
  const [incomingMessage, setIncomingMessage] = useState("");

import { useRouter } from "next/navigation";
  useEffect(() => {
import { supabaseBrowser } from "@/lib/supabase-browser";
    trackHomepageVisit().catch(err => console.debug("Failed to track homepage visit:", err));
  }, []);
  const router = useRouter();

  const [redirecting, setRedirecting] = useState(false);
  const analysis = useMemo(() => analyzeMessage(incomingMessage), [incomingMessage]);
  const hasInput = incomingMessage.trim().length > 0;

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-3xl items-center px-4 py-10 md:py-16">
      <section className="w-full text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-100 md:text-5xl">Don’t send it yet.</h1>

  async function handleGenerateClick() {
    if (redirecting) return;
    setRedirecting(true);

    try {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (session?.user) {
        router.replace("/dashboard");
        return;
      }

      router.replace("/login");
    } catch {
      setRedirecting(false);
    }
  }
        <p className="mt-2 text-4xl font-extrabold tracking-tight text-white md:text-6xl">Control how this conversation ends.</p>

        <p className="mx-auto mt-8 max-w-2xl text-lg text-slate-300 md:text-xl">
          One reply can shift everything. Make yours intentional.
        </p>
        <p className="mt-2 text-4xl font-extrabold tracking-tight text-white md:text-6xl">Control how your conversation ends.</p>
        <div className="mx-auto mt-8 max-w-2xl">
          <textarea
            className="min-h-[132px] w-full rounded-lg border border-slate-700 bg-slate-950 p-4 text-base text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
            placeholder="Paste the message you received..."
            value={incomingMessage}
            onChange={(e) => setIncomingMessage(e.target.value)}
          />
        </div>

        <p className="mt-3 text-sm text-slate-400">⚠️ Most people respond emotionally here.</p>

        {hasInput ? (
          <div className="mx-auto mt-6 max-w-2xl rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-left">
            <div className="grid gap-3 md:grid-cols-3">
                <p className="mt-1 text-sm font-medium text-slate-100">{analysis.toneDetected}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Pressure level</p>
                <p className="mt-1 text-sm font-medium text-slate-100">{analysis.pressureLevel}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Hidden intent</p>
                <p className="mt-1 text-sm font-medium text-slate-100">{analysis.hiddenIntent}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-8">
          <button
            type="button"
            className="rounded-md bg-sky-500 px-6 py-3 text-base font-semibold text-slate-950 hover:bg-sky-400"
          >
            Generate the best reply
          </button>
        </div>
            className="rounded-md bg-sky-500 px-6 py-3 text-base font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
            onClick={handleGenerateClick}
            disabled={redirecting}
    </main>
            {redirecting ? "Redirecting..." : "Generate the best reply"}
}
