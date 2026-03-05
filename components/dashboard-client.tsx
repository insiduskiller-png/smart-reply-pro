"use client";

import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import UsageProgressMeter from "@/components/usage-progress-meter";
import ProFeaturePreview from "@/components/pro-feature-preview";
import ResponseComparison from "@/components/response-comparison";

const freeTones = ["Neutral", "Direct", "Polite", "Friendly"];
const preTones = ["Tactical Control", "Precision Authority", "Psychological Edge"];

type Profile = {
  subscription_status: string;
  daily_usage_count: number;
};

type Reply = {
  id: string;
  input: string;
  tone: string;
  reply: string;
  created_at: string;
  favorite?: boolean;
};

type ConversationThread = {
  id: string;
  title: string | null;
  created_at: string;
};

type ConversationMessage = {
  id: string;
  thread_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type LikelyReaction = {
  positive: number;
  neutral: number;
  negative: number;
  why: string;
};

type RewriteMode = "Lawyer Mode" | "Negotiator Mode" | "Manager Mode";
type QuickRewriteMode = "Shorter" | "More Direct" | "More Polite" | "Stronger";

const rewriteModes: RewriteMode[] = ["Lawyer Mode", "Negotiator Mode", "Manager Mode"];
const quickRewriteModes: QuickRewriteMode[] = ["Shorter", "More Direct", "More Polite", "Stronger"];

export default function DashboardClient({
  profile,
  initialTemplateInput = "",
}: {
  profile: Profile;
  initialTemplateInput?: string;
}) {
  const [input, setInput] = useState("");
  const [context, setContext] = useState("");
  const [tone, setTone] = useState(freeTones[0]);
  const [toneDetection, setToneDetection] = useState("");
  const [outputs, setOutputs] = useState<string[]>([]);
  const [originalOutputs, setOriginalOutputs] = useState<string[]>([]);
  const [score, setScore] = useState<{
    score: number;
    leverage: string;
    assertiveness_score: number;
    tone_detected: string;
    pressure_level: number;
    risks: string[];
    manipulation_detected: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [powerLoading, setPowerLoading] = useState(false);
  const [error, setError] = useState("");
  const [styleWarning, setStyleWarning] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [tab, setTab] = useState<"generate" | "history" | "favorites">("generate");
  const [history, setHistory] = useState<Reply[]>([]);
  const [favorites, setFavorites] = useState<Reply[]>([]);
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [activeMessages, setActiveMessages] = useState<ConversationMessage[]>([]);
  const [activeMessagesLoading, setActiveMessagesLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [generationAnalysis, setGenerationAnalysis] = useState<{
    tone_detected: string;
    pressure_level: number;
    manipulation_detected: boolean;
  } | null>(null);
  const [likelyReaction, setLikelyReaction] = useState<LikelyReaction | null>(null);
  const [reactionLoading, setReactionLoading] = useState(false);
  const [strategicInsight, setStrategicInsight] = useState("");
  const [strategicInsightLoading, setStrategicInsightLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [quickRewriteLoading, setQuickRewriteLoading] = useState<{ index: number; mode: QuickRewriteMode } | null>(null);
  const [rewriteLoading, setRewriteLoading] = useState<{ index: number; mode: RewriteMode } | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [messagesUsed, setMessagesUsed] = useState<number | null>(null);
  const [proOptimizedReply, setProOptimizedReply] = useState<string | null>(null);
  const [proReplyLoading, setProReplyLoading] = useState(false);
  const suggestTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isPro = profile.subscription_status === "pro";
  const isPremiumStyle = preTones.includes(tone);

  async function fetchThreads() {
    setThreadsLoading(true);
    try {
      const response = await fetch("/api/conversations/threads");
      const data = await response.json().catch(() => null);
      if (response.ok && data?.threads) {
        setThreads(data.threads);
        if (!activeThreadId && data.threads.length > 0) {
          setActiveThreadId(data.threads[0].id);
        }
      }
    } catch {
      // Silent fail
    } finally {
      setThreadsLoading(false);
    }
  }

  async function fetchActiveMessages(threadId: string) {
    if (!threadId) {
      setActiveMessages([]);
      return;
    }

    setActiveMessagesLoading(true);
    try {
      const response = await fetch(`/api/conversations/messages?threadId=${encodeURIComponent(threadId)}`);
      const data = await response.json().catch(() => null);
      if (response.ok && data?.messages) {
        setActiveMessages(data.messages);
      }
    } catch {
      // Silent fail
    } finally {
      setActiveMessagesLoading(false);
    }
  }

  async function startNewConversation() {
    try {
      const response = await fetch("/api/conversations/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: input.slice(0, 60) || "New Conversation" }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.thread?.id) {
        const newThreadId = data.thread.id;
        setActiveThreadId(newThreadId);
        setActiveMessages([]);
        setInput("");
        setContext("");
        setOutputs([]);
        setOriginalOutputs([]);
        setToneDetection("");
        setProOptimizedReply(null);
        await fetchThreads();
      }
    } catch {
      // Silent fail
    }
  }

  useEffect(() => {
    if (initialTemplateInput) {
      setInput(initialTemplateInput);
      setTab("generate");
    }
  }, [initialTemplateInput]);

  useEffect(() => {
    async function initializeThreads() {
      const response = await fetch("/api/conversations/threads").catch(() => null);
      const data = await response?.json().catch(() => null);

      if (response?.ok && data?.threads?.length > 0) {
        setThreads(data.threads);
        setActiveThreadId(data.threads[0].id);
        return;
      }

      const createResponse = await fetch("/api/conversations/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Conversation" }),
      }).catch(() => null);
      const createData = await createResponse?.json().catch(() => null);
      if (createResponse?.ok && createData?.thread?.id) {
        setActiveThreadId(createData.thread.id);
      }

      fetchThreads();
    }

    initializeThreads();
  }, []);

  useEffect(() => {
    if (activeThreadId) {
      fetchActiveMessages(activeThreadId);
    }
  }, [activeThreadId]);

  useEffect(() => {
    if (!isPro) {
      async function fetchUsage() {
        try {
          const response = await fetch("/api/usage");
          const data = await response.json().catch(() => null);
          if (response.ok && data?.count !== undefined) {
            setRemaining(Math.max(0, 5 - data.count));
          }
        } catch {
          // Silent fail, show nothing
        }
      }
      fetchUsage();
    }
  }, [isPro]);

  // Fetch messages usage for free users
  useEffect(() => {
    if (!isPro) {
      async function fetchMessagesUsage() {
        try {
          const response = await fetch("/api/messages-usage");
          const data = await response.json().catch(() => null);
          if (response.ok && data?.messagesUsed !== undefined) {
            setMessagesUsed(data.messagesUsed);
          }
        } catch {
          // Silent fail, show nothing
        }
      }
      fetchMessagesUsage();
    }
  }, [isPro]);

  useEffect(() => {
    if (tab === "history") {
      async function fetchHistory() {
        setHistoryLoading(true);
        try {
          const response = await fetch("/api/replies/history");
          const data = await response.json().catch(() => null);
          if (response.ok && data?.replies) {
            setHistory(data.replies);
          }
        } catch {
          // Silent fail
        } finally {
          setHistoryLoading(false);
        }
      }
      fetchHistory();
    } else if (tab === "favorites") {
      async function fetchFavorites() {
        setFavoritesLoading(true);
        try {
          const response = await fetch("/api/replies/favorites");
          const data = await response.json().catch(() => null);
          if (response.ok && data?.replies) {
            setFavorites(data.replies);
          }
        } catch {
          // Silent fail
        } finally {
          setFavoritesLoading(false);
        }
      }
      fetchFavorites();
    }
  }, [tab]);

  function handleUpgrade() {
    if (isPro) return;
    window.location.href = "/pricing";
  }

  async function toggleFavorite(replyId: string, currentFavorite: boolean) {
    try {
      const response = await fetch("/api/replies/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId, favorite: !currentFavorite }),
      });
      if (response.ok) {
        // Update local state
        if (tab === "history") {
          setHistory(history.map(r => r.id === replyId ? { ...r, favorite: !currentFavorite } : r));
        } else if (tab === "favorites") {
          setFavorites(favorites.map(r => r.id === replyId ? { ...r, favorite: !currentFavorite } : r));
        }
      }
    } catch {
      // Silent fail
    }
  }

  async function suggestBestTone(message: string) {
    if (!message.trim() || message.length < 10) return;

    setSuggesting(true);
    try {
      const response = await fetch("/api/suggest-tone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: message, isPro }),
      });

      const data = await response.json();
      if (response.ok && data.tone) {
        setTone(data.tone);
      }
    } catch {
      // Silent fail
    } finally {
      setSuggesting(false);
    }
  }

  function handleInputChange(value: string) {
    setInput(value);
    
    // Debounce suggestion
    if (suggestTimeoutRef.current) {
      clearTimeout(suggestTimeoutRef.current);
    }
    suggestTimeoutRef.current = setTimeout(() => {
      suggestBestTone(value);
    }, 800);
  }

  async function shareReply(reply: string) {
    const appUrl = typeof window !== "undefined" ? window.location.origin : "";
    const formattedText = `${reply}\n\n---\nGenerated with Smart Reply Pro\n${appUrl}`;
    try {
      await navigator.clipboard.writeText(formattedText);
    } catch {
      // Fallback - just copy the reply
      try {
        await navigator.clipboard.writeText(reply);
      } catch {
        // Silent fail
      }
    }
  }

  async function exportAsImage(reply: string, tone: string) {
    try {
      // Create a temporary container
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "fixed";
      tempContainer.style.left = "-9999px";
      tempContainer.style.backgroundColor = "#1e293b";
      tempContainer.style.padding = "40px";
      tempContainer.style.borderRadius = "12px";
      tempContainer.style.maxWidth = "600px";
      tempContainer.style.fontFamily = "system-ui, -apple-system, sans-serif";
      tempContainer.innerHTML = `
        <div style="color: #e2e8f0; line-height: 1.6;">
          <div style="color: #94a3b8; font-size: 12px; margin-bottom: 12px;">Generated with Smart Reply Pro</div>
          <div style="color: #0ea5e9; font-size: 13px; margin-bottom: 16px; font-weight: 500;">Tone: ${tone}</div>
          <div style="color: #f1f5f9; font-size: 15px; white-space: pre-wrap; line-height: 1.7;">${reply}</div>
          <div style="color: #64748b; font-size: 11px; margin-top: 20px; border-top: 1px solid #334155; padding-top: 12px;">smartreply.pro</div>
        </div>
      `;
      document.body.appendChild(tempContainer);

      // Generate canvas
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: "#1e293b",
        scale: 2,
        logging: false,
      });

      // Remove temp container
      document.body.removeChild(tempContainer);

      // Download image
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `smart-reply-${Date.now()}.png`;
      link.click();
    } catch {
      // Silent fail
    }
  }

  async function generate(modifier?: string) {
    if (!isPro && isPremiumStyle) {
      setStyleWarning("This style requires Pro plan.");
      return;
    }

    setLoading(true);
    setError("");
    setStyleWarning("");
    setQuickRewriteLoading(null);
    setLikelyReaction(null);
    setReactionLoading(false);
    setStrategicInsight("");
    setStrategicInsightLoading(false);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          context,
          tone,
          modifier,
          threadId: activeThreadId || undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error || "Generation failed.");
        return;
      }

      const resolvedThreadId = data?.threadId || activeThreadId;
      if (resolvedThreadId && resolvedThreadId !== activeThreadId) {
        setActiveThreadId(resolvedThreadId);
      }

      setOutputs(data?.outputs || []);
      setOriginalOutputs(data?.outputs || []);
      setToneDetection(data?.detectedTone || "");
      setGenerationAnalysis(data?.analysis || null);

      if (data?.outputs?.[0]) {
        setReactionLoading(true);
        try {
          const reactionResponse = await fetch("/api/reaction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reply: data.outputs[0] }),
          });
          const reactionData = await reactionResponse.json().catch(() => null);
          if (reactionResponse.ok) {
            setLikelyReaction({
              positive: reactionData?.positive ?? 0,
              neutral: reactionData?.neutral ?? 0,
              negative: reactionData?.negative ?? 0,
              why: reactionData?.why ?? "",
            });
          }
        } catch {
          // Silent fail - do not block generation
        } finally {
          setReactionLoading(false);
        }

        setStrategicInsightLoading(true);
        try {
          const insightResponse = await fetch("/api/strategic-insight", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reply: data.outputs[0] }),
          });
          const insightData = await insightResponse.json().catch(() => null);
          if (insightResponse.ok) {
            setStrategicInsight(insightData?.insight || "");
          }
        } catch {
          // Silent fail - do not block generation
        } finally {
          setStrategicInsightLoading(false);
        }
      }
      
      // Save first reply to history
      if (data?.outputs?.[0]) {
        try {
          await fetch("/api/replies/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input,
              context: context || undefined,
              tone,
              reply: data.outputs[0],
            }),
          });
        } catch {
          // Silent fail - don't block generation
        }
      }
      
      // For free users, generate pro optimized reply for comparison
      if (!isPro && data?.outputs?.[0]) {
        setProReplyLoading(true);
        try {
          const proResponse = await fetch("/api/pro-optimized-reply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input, context, tone }),
          });
          const proData = await proResponse.json().catch(() => null);
          if (proResponse.ok && proData?.proOptimizedReply) {
            setProOptimizedReply(proData.proOptimizedReply);
          }
        } catch {
          // Silent fail - show comparison anyway with placeholder
          setProOptimizedReply("Pro optimized response loading...");
        } finally {
          setProReplyLoading(false);
        }
      } else if (isPro) {
        // For pro users, use the "Stronger" variant as the optimized version
        setProOptimizedReply(data?.outputs?.[1] || data?.outputs?.[0] || null);
      }
      if (!isPro) {
        try {
          const usageResponse = await fetch("/api/usage");
          const usageData = await usageResponse.json().catch(() => null);
          if (usageResponse.ok && usageData?.count !== undefined) {
            setRemaining(Math.max(0, 5 - usageData.count));
          }
        } catch {
          // Silent fail
        }
        
        try {
          const messagesResponse = await fetch("/api/messages-usage");
          const messagesData = await messagesResponse.json().catch(() => null);
          if (messagesResponse.ok && messagesData?.messagesUsed !== undefined) {
            setMessagesUsed(messagesData.messagesUsed);
          }
        } catch {
          // Silent fail
        }
      }

      await fetchThreads();
      if (resolvedThreadId) {
        await fetchActiveMessages(resolvedThreadId);
      }
    } catch {
      setError("Network error while generating response.");
    } finally {
      setLoading(false);
    }
  }

  function reactionBar(value: number) {
    const safe = Math.max(0, Math.min(100, Math.round(value)));
    const blocks = Math.round(safe / 10);
    return "█".repeat(blocks);
  }

  async function rewriteOutput(index: number, mode: RewriteMode) {
    if (!outputs[index]) return;

    if (!isPro) {
      setShowUpgradeModal(true);
      return;
    }

    setRewriteLoading({ index, mode });
    setError("");
    try {
      const response = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reply: outputs[index],
          mode,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        setError(data?.error || "Rewrite failed.");
        return;
      }

      const rewrittenReply = data?.reply;
      if (!rewrittenReply) {
        setError("Rewrite failed.");
        return;
      }

      setOutputs((prev) => {
        const next = [...prev];
        next[index] = rewrittenReply;
        return next;
      });

      try {
        await fetch("/api/replies/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input,
            context: context || undefined,
            tone: `${tone} • ${mode}`,
            reply: rewrittenReply,
          }),
        });
      } catch {
        // Silent fail - do not block rewrite
      }
    } catch {
      setError("Network error while rewriting reply.");
    } finally {
      setRewriteLoading(null);
    }
  }

  async function quickRewriteOutput(index: number, mode: QuickRewriteMode) {
    const sourceReply = originalOutputs[index] ?? outputs[index];
    if (!sourceReply) return;

    setQuickRewriteLoading({ index, mode });
    setError("");
    try {
      const response = await fetch("/api/quick-rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reply: sourceReply,
          mode,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        setError(data?.error || "Quick rewrite failed.");
        return;
      }

      const rewrittenReply = data?.reply;
      if (!rewrittenReply) {
        setError("Quick rewrite failed.");
        return;
      }

      setOutputs((prev) => {
        const next = [...prev];
        next[index] = rewrittenReply;
        return next;
      });
    } catch {
      setError("Network error while quick rewriting.");
    } finally {
      setQuickRewriteLoading(null);
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
  }

  return (
    <div className="space-y-6">
      {!isPro ? (
        <div className="rounded-lg bg-gradient-to-r from-sky-900 to-sky-800 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-sky-100">Upgrade to Pro for unlimited replies and advanced modes.</p>
            <button onClick={handleUpgrade} className="ml-4 whitespace-nowrap rounded-md bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60">
              Upgrade to Pro
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setTab("generate")}
          className={`px-4 py-2 font-medium ${tab === "generate" ? "border-b-2 border-sky-500 text-sky-400" : "text-slate-400 hover:text-slate-300"}`}
        >
          Generate
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-2 font-medium ${tab === "history" ? "border-b-2 border-sky-500 text-sky-400" : "text-slate-400 hover:text-slate-300"}`}
        >
          History
        </button>
        <button
          onClick={() => setTab("favorites")}
          className={`px-4 py-2 font-medium ${tab === "favorites" ? "border-b-2 border-sky-500 text-sky-400" : "text-slate-400 hover:text-slate-300"}`}
        >
          Favorites
        </button>
      </div>
      {tab === "generate" ? (
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <div className="flex items-center gap-3">
            {!isPro && remaining !== null ? (
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                {remaining} of 5 remaining
              </span>
            ) : null}
            {isPro ? (
              <span className="rounded-full border border-emerald-700 bg-emerald-900/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                PRO MEMBER
              </span>
            ) : (
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wider text-slate-400">
                FREE PLAN
              </span>
            )}
          </div>
        </div>
        {toneDetection ? <p className="mb-3 text-xs text-sky-400">Detected tone: {toneDetection}</p> : null}
        {error ? <p className="mb-3 text-sm text-rose-400">{error}</p> : null}
        {styleWarning ? <p className="mb-3 text-sm text-amber-400">{styleWarning}</p> : null}
        
        {/* Usage Progress Meter for Free Users */}
        {!isPro && messagesUsed !== null ? (
          <div className="mb-6">
            <UsageProgressMeter messagesUsed={messagesUsed} limit={6} />
          </div>
        ) : null}
        
        <textarea className="min-h-28 w-full rounded-md border border-slate-700 bg-slate-950 p-3" placeholder="Paste incoming message" value={input} onChange={(e) => handleInputChange(e.target.value)} />
        <div className="mt-2 text-xs text-slate-400">
          {suggesting ? "✨ Suggesting best tone..." : input.length >= 10 ? "✓ Tone suggested" : ""}
        </div>
        <textarea className="mt-3 min-h-20 w-full rounded-md border border-slate-700 bg-slate-950 p-3" placeholder="Optional context" value={context} onChange={(e) => setContext(e.target.value)} />
        <select className="mt-3 w-full rounded-md border border-slate-700 bg-slate-950 p-3" value={tone} onChange={(e) => setTone(e.target.value)}>
          <optgroup label="Free">
            {freeTones.map((item) => (<option key={item} value={item}>{item}</option>))}
          </optgroup>
          {isPro && (
            <optgroup label="Pro">
              {preTones.map((item) => (<option key={item} value={item}>{item}</option>))}
            </optgroup>
          )}
        </select>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md bg-sky-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60" onClick={() => generate()} disabled={loading || powerLoading}>{loading ? "Generating..." : "Generate"}</button>
          {isPro ? <button className="rounded-md border border-slate-700 px-4 py-2 disabled:opacity-60" onClick={loadPowerScore} disabled={loading || powerLoading}>{powerLoading ? "Analyzing..." : "Power score"}</button> : null}
          {!isPro ? (
            <button className="rounded-md border border-slate-700 px-4 py-2" onClick={handleUpgrade}>
              Upgrade to Pro
            </button>
          ) : null}
        </div>

        {outputs.length ? (
          <div className="grid gap-3">
            {outputs.map((output, index) => (
              <article key={index} className="card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-semibold">{isPro ? ["Balanced", "Stronger", "Softer"][index] : "Reply"}</h2>
                  <div className="flex gap-2">
                    <button className="text-xs text-sky-400 hover:text-sky-300" onClick={() => navigator.clipboard.writeText(output)}>Copy</button>
                    <button className="text-xs text-sky-400 hover:text-sky-300" onClick={() => shareReply(output)}>Share</button>
                    <button className="text-xs text-sky-400 hover:text-sky-300" onClick={() => exportAsImage(output, tone)}>Export</button>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-slate-200">{output}</p>

                <div className="mt-4 rounded-md border border-slate-700 bg-slate-900/40 p-3">
                  <h3 className="text-sm font-semibold text-slate-100">Quick Rewrite</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quickRewriteModes.map((mode) => {
                      const isLoadingMode = quickRewriteLoading?.index === index && quickRewriteLoading?.mode === mode;
                      const isBusy = quickRewriteLoading?.index === index;
                      return (
                        <button
                          key={mode}
                          type="button"
                          className="inline-flex items-center gap-2 rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:border-sky-500 hover:text-sky-300 disabled:opacity-60"
                          onClick={() => quickRewriteOutput(index, mode)}
                          disabled={isBusy}
                        >
                          {isLoadingMode ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" /> : null}
                          {isLoadingMode ? "Rewriting..." : mode}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 rounded-md border border-slate-700 bg-slate-900/40 p-3">
                  <h3 className="text-sm font-semibold text-slate-100">Advanced Rewrite Modes (Pro)</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rewriteModes.map((mode) => {
                      const isLoadingMode = rewriteLoading?.index === index && rewriteLoading?.mode === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          className={`rounded-md border px-3 py-2 text-xs ${isPro ? "border-slate-600 text-slate-200 hover:border-sky-500 hover:text-sky-300" : "border-slate-700 text-slate-400"}`}
                          onClick={() => rewriteOutput(index, mode)}
                          disabled={isLoadingMode}
                        >
                          {isLoadingMode ? "Rewriting..." : isPro ? mode : `${mode} • 🔒 Pro Feature`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {/* Free vs Pro Response Comparison */}
        {!isPro && outputs.length > 0 && proOptimizedReply && (
          <ResponseComparison
            freeReply={outputs[0]}
            proReply={proOptimizedReply}
            isPro={isPro}
            onUpgradeClick={handleUpgrade}
          />
        )}

        {(reactionLoading || likelyReaction) ? (
          <section className="card p-4 bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-100 mb-3">Likely Reaction</h2>
            {reactionLoading ? (
              <p className="text-sm text-slate-300 animate-pulse">Analyzing likely reactions...</p>
            ) : likelyReaction ? (
              <div className="space-y-3">
                <p className="font-mono text-sm text-slate-200">Positive {reactionBar(likelyReaction.positive)} {likelyReaction.positive}%</p>
                <p className="font-mono text-sm text-slate-200">Neutral {reactionBar(likelyReaction.neutral)} {likelyReaction.neutral}%</p>
                <p className="font-mono text-sm text-slate-200">Negative {reactionBar(likelyReaction.negative)} {likelyReaction.negative}%</p>
                <div className="pt-2">
                  <p className="text-xs text-slate-400">Why this reaction is likely</p>
                  <p className="mt-1 text-sm text-slate-200">{likelyReaction.why}</p>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {(strategicInsightLoading || strategicInsight) ? (
          <section className="rounded-md border border-sky-500/20 bg-sky-500/5 p-4">
            <h2 className="text-sm font-semibold text-sky-200">Strategic Insight</h2>
            {strategicInsightLoading ? (
              <p className="mt-2 text-sm text-slate-300 animate-pulse">Analyzing strategic leverage...</p>
            ) : (
              <p className="mt-2 text-sm text-slate-200">{strategicInsight}</p>
            )}
          </section>
        ) : null}

        <section className="rounded-md border border-slate-700 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-100">Active Conversation</h2>
            <button
              type="button"
              className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-sky-500 hover:text-sky-300"
              onClick={startNewConversation}
            >
              New Conversation
            </button>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs text-slate-400">Conversation thread</label>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm"
              value={activeThreadId}
              onChange={(e) => setActiveThreadId(e.target.value)}
            >
              {threads.map((thread) => (
                <option key={thread.id} value={thread.id}>
                  {(thread.title || "New Conversation").slice(0, 40)} • {new Date(thread.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 rounded-md border border-slate-800 bg-slate-950/60 p-3">
            {threadsLoading || activeMessagesLoading ? (
              <p className="text-sm text-slate-400">Loading conversation...</p>
            ) : activeMessages.length === 0 ? (
              <p className="text-sm text-slate-400">No messages yet. Send a message to start this conversation.</p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {activeMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-md px-3 py-2 text-sm ${
                      message.role === "user"
                        ? "ml-8 border border-sky-700/40 bg-sky-900/20 text-sky-100"
                        : "mr-8 border border-slate-700 bg-slate-900 text-slate-200"
                    }`}
                  >
                    <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
                      {message.role === "user" ? "User" : "Assistant"}
                    </p>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {generationAnalysis && isPro ? (
          <section className="card p-4 bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-100 mb-3">Generation Analysis</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-400">Tone Detected</p>
                <p className="mt-2 text-sm font-semibold text-sky-400">{generationAnalysis.tone_detected}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Pressure Level</p>
                <div className="mt-1 h-2 rounded bg-slate-800"><div className="h-2 rounded bg-rose-500" style={{ width: `${generationAnalysis.pressure_level}%` }} /></div>
                <p className="mt-1 text-xs font-semibold">{generationAnalysis.pressure_level}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Manipulation</p>
                <p className="mt-2 text-sm font-semibold">{generationAnalysis.manipulation_detected ? <span className="text-rose-400">Detected</span> : <span className="text-green-400">None</span>}</p>
              </div>
            </div>
          </section>
        ) : null}

        {score ? (
          <section className="card p-5">
            <h2 className="text-lg font-semibold">Power Balance Score: {score.score}</h2>
            <div className="mt-2 h-2 rounded bg-slate-800"><div className="h-2 rounded bg-sky-500" style={{ width: `${score.score}%` }} /></div>
            <p className="mt-3 text-sm text-slate-300">Leverage: {score.leverage}</p>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-400">Assertiveness</p>
                <div className="mt-1 h-2 rounded bg-slate-800"><div className="h-2 rounded bg-amber-500" style={{ width: `${score.assertiveness_score}%` }} /></div>
                <p className="mt-1 text-xs font-semibold">{score.assertiveness_score}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Pressure Level</p>
                <div className="mt-1 h-2 rounded bg-slate-800"><div className="h-2 rounded bg-rose-500" style={{ width: `${score.pressure_level}%` }} /></div>
                <p className="mt-1 text-xs font-semibold">{score.pressure_level}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Tone Detected</p>
                <p className="mt-2 text-xs font-semibold">{score.tone_detected}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-300">Manipulation detected: {score.manipulation_detected ? "Yes" : "No"}</p>
            {score.risks?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-slate-400">Risks:</p>
                <ul className="mt-1 text-xs text-slate-300">
                  {score.risks.map((risk, i) => <li key={i}>• {risk}</li>)}
                </ul>
              </div>
            )}
          </section>
        ) : null}
        
        {/* Pro Feature Preview Section */}
        <ProFeaturePreview isPro={isPro} onUpgradeClick={handleUpgrade} />
      </div>
      ) : null}
      {tab === "history" ? (
        <div className="space-y-3">
          {historyLoading ? (
            <p className="text-sm text-slate-400">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-400">No replies yet.</p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">{item.tone}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className={`text-lg ${item.favorite ? "text-yellow-400" : "text-slate-400 hover:text-yellow-400"}`}
                      onClick={() => toggleFavorite(item.id, item.favorite || false)}
                      title={item.favorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      ★
                    </button>
                    <button
                      className="text-xs text-sky-400 hover:text-sky-300"
                      onClick={() => navigator.clipboard.writeText(item.reply)}
                    >
                      Copy
                    </button>
                    <button
                      className="text-xs text-sky-400 hover:text-sky-300"
                      onClick={() => shareReply(item.reply)}
                    >
                      Share
                    </button>
                    <button
                      className="text-xs text-sky-400 hover:text-sky-300"
                      onClick={() => exportAsImage(item.reply, item.tone)}
                    >
                      Export
                    </button>
                  </div>
                </div>
                <div className="mt-2 mb-2">
                  <p className="text-xs text-slate-400">Input:</p>
                  <p className="mt-1 text-sm text-slate-200">{item.input}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Reply:</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{item.reply}</p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
      {tab === "favorites" ? (
        <div className="space-y-3">
          {favoritesLoading ? (
            <p className="text-sm text-slate-400">Loading favorites...</p>
          ) : favorites.length === 0 ? (
            <p className="text-sm text-slate-400">No favorites yet. Star replies to save them here.</p>
          ) : (
            favorites.map((item) => (
              <div key={item.id} className="card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">{item.tone}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className={`text-lg ${item.favorite ? "text-yellow-400" : "text-slate-400 hover:text-yellow-400"}`}
                      onClick={() => toggleFavorite(item.id, item.favorite || false)}
                      title={item.favorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      ★
                    </button>
                    <button
                      className="text-xs text-sky-400 hover:text-sky-300"
                      onClick={() => navigator.clipboard.writeText(item.reply)}
                    >
                      Copy
                    </button>
                    <button
                      className="text-xs text-sky-400 hover:text-sky-300"
                      onClick={() => shareReply(item.reply)}
                    >
                      Share
                    </button>
                    <button
                      className="text-xs text-sky-400 hover:text-sky-300"
                      onClick={() => exportAsImage(item.reply, item.tone)}
                    >
                      Export
                    </button>
                  </div>
                </div>
                <div className="mt-2 mb-2">
                  <p className="text-xs text-slate-400">Input:</p>
                  <p className="mt-1 text-sm text-slate-200">{item.input}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Reply:</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{item.reply}</p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {showUpgradeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-slate-100">🔒 Pro Feature</h2>
            <p className="mt-2 text-sm text-slate-300">
              Advanced Rewrite Modes are available on Pro. Upgrade to unlock Lawyer, Negotiator, and Manager rewrites.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200"
                onClick={() => setShowUpgradeModal(false)}
              >
                Not now
              </button>
              <button
                type="button"
                className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950"
                onClick={handleUpgrade}
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
