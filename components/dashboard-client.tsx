"use client";

import { useState } from "react";

const tones = ["Professional", "Assertive", "Polite Decline", "Strategic", "CEO Mode", "Friendly"];

type Profile = {
  subscription_status: string;
  daily_usage_count: number;
};

export default function DashboardClient({ profile }: { profile: Profile }) {
  const [input, setInput] = useState("");
  const [context, setContext] = useState("");
  const [tone, setTone] = useState(tones[0]);
  const [toneDetection, setToneDetection] = useState("");
  const [outputs, setOutputs] = useState<string[]>([]);
  const [score, setScore] = useState<{ score: number; leverage: string; manipulation_detected: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [powerLoading, setPowerLoading] = useState(false);
  const [error, setError] = useState("");

  const isPro = profile.subscription_status === "pro";

  async function generate(modifier?: string) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, context, tone, modifier }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error || "Generation failed.");
        return;
      }
      setOutputs(data?.outputs || []);
      setToneDetection(data?.detectedTone || "");
    } catch {
      setError("Network error while generating response.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPowerScore() {
    setPowerLoading(true);
    setError("");
    try {
      const response = await fetch("/api/power-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, context }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error || "Power score failed.");
        return;
      }
      setScore(data);
    } catch {
      setError("Network error while fetching power score.");
    } finally {
      setPowerLoading(false);
    }
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, context, tone, modifier }),
    });
    const data = await response.json();
    setOutputs(data.outputs || []);
    setToneDetection(data.detectedTone || "");
    setLoading(false);
  }

  async function loadPowerScore() {
    const response = await fetch("/api/power-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, context }),
    });
    const data = await response.json();
    setScore(data);
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wider">{isPro ? "Pro" : "Free"}</span>
        </div>
        {toneDetection ? <p className="mb-3 text-xs text-sky-400">Detected tone: {toneDetection}</p> : null}
        {error ? <p className="mb-3 text-sm text-rose-400">{error}</p> : null}
        <textarea className="min-h-28 w-full rounded-md border border-slate-700 bg-slate-950 p-3" placeholder="Paste incoming message" value={input} onChange={(e) => setInput(e.target.value)} />
        <textarea className="mt-3 min-h-20 w-full rounded-md border border-slate-700 bg-slate-950 p-3" placeholder="Optional context" value={context} onChange={(e) => setContext(e.target.value)} />
        <select className="mt-3 w-full rounded-md border border-slate-700 bg-slate-950 p-3" value={tone} onChange={(e) => setTone(e.target.value)}>
          {tones.map((item) => (<option key={item} value={item}>{item}</option>))}
        </select>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md bg-sky-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60" onClick={() => generate()} disabled={loading || powerLoading}>{loading ? "Generating..." : "Generate"}</button>
          {isPro ? <button className="rounded-md border border-slate-700 px-4 py-2 disabled:opacity-60" onClick={loadPowerScore} disabled={loading || powerLoading}>{powerLoading ? "Analyzing..." : "Power score"}</button> : null}
          {isPro ? <button className="rounded-md border border-slate-700 px-4 py-2 disabled:opacity-60" onClick={() => generate("Rewrite this response with 20% stronger dominance.")} disabled={loading || powerLoading}>Escalate</button> : null}
          {isPro ? <button className="rounded-md border border-slate-700 px-4 py-2 disabled:opacity-60" onClick={() => generate("Rewrite this response reducing friction by 30%.")} disabled={loading || powerLoading}>De-escalate</button> : null}
          <button className="rounded-md bg-sky-500 px-4 py-2 font-medium text-slate-950" onClick={() => generate()} disabled={loading}>Generate</button>
          {isPro ? <button className="rounded-md border border-slate-700 px-4 py-2" onClick={loadPowerScore}>Power score</button> : null}
          {isPro ? <button className="rounded-md border border-slate-700 px-4 py-2" onClick={() => generate("Rewrite this response with 20% stronger dominance.")}>Escalate</button> : null}
          {isPro ? <button className="rounded-md border border-slate-700 px-4 py-2" onClick={() => generate("Rewrite this response reducing friction by 30%.")}>De-escalate</button> : null}
        </div>
      </div>

      {outputs.length ? (
        <div className="grid gap-3">
          {outputs.map((output, index) => (
            <article key={index} className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">{isPro ? ["Balanced", "Stronger", "Softer"][index] : "Reply"}</h2>
                <button className="text-xs text-sky-400" onClick={() => navigator.clipboard.writeText(output)}>Copy</button>
              </div>
              <p className="whitespace-pre-wrap text-slate-200">{output}</p>
            </article>
          ))}
        </div>
      ) : null}

      {score ? (
        <section className="card p-5">
          <h2 className="text-lg font-semibold">Power Balance Score: {score.score}</h2>
          <div className="mt-2 h-2 rounded bg-slate-800"><div className="h-2 rounded bg-sky-500" style={{ width: `${score.score}%` }} /></div>
          <p className="mt-3 text-sm text-slate-300">Leverage: {score.leverage}</p>
          <p className="mt-2 text-sm text-slate-300">Manipulation detected: {score.manipulation_detected ? "Yes" : "No"}</p>
        </section>
      ) : null}
    </div>
  );
}
