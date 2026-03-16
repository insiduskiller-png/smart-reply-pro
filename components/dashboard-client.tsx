"use client";

import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import ProFeaturePreview from "@/components/pro-feature-preview";
import TemplateSelector, { type TemplateType } from "@/components/template-selector";

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

type ReplyProfile = {
  id: string;
  profile_name?: string;
  profile_category?: string | null;
  contact_name: string;
  relationship_type?: string | null;
  context_notes?: string | null;
  style_summary?: string | null;
  tone_pattern?: string | null;
  sentence_length?: string | null;
  directness_level?: string | null;
  emoji_usage?: string | null;
  formality_level?: string | null;
  conflict_style?: string | null;
  last_activity_at?: string | null;
  created_at: string;
};

type ProfileMessageRole = "incoming" | "user_reply" | "assistant_suggestion" | "history_import";

type ProfileMessage = {
  id: string;
  profile_id: string;
  role: ProfileMessageRole;
  content: string;
  created_at: string;
};

type ReplyAnalysis = {
  reply_score: number;
  clarity: "Low" | "Medium" | "High";
  influence: "Low" | "Medium" | "High";
  tone_detected: string;
  pressure_level: number;
  manipulation_risk: "None" | "Low" | "Medium" | "High";
};

type RewriteMode = "Lawyer Mode" | "Negotiator Mode" | "Manager Mode";
type QuickRewriteMode = "Shorter" | "More Direct" | "More Polite" | "More Assertive";
type StyleKey = "calm" | "assertive" | "strategic";

const rewriteModes: RewriteMode[] = ["Lawyer Mode", "Negotiator Mode", "Manager Mode"];
const quickRewriteModes: QuickRewriteMode[] = ["Shorter", "More Direct", "More Polite", "More Assertive"];
const categoryOptions = ["Dating", "Work", "Client", "Family", "Friend", "Conflict", "Other"] as const;
const maxStyleRegenerations = 2;

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
  const [loading, setLoading] = useState(false);
  const [styleRegenerating, setStyleRegenerating] = useState<StyleKey | null>(null);
  const [error, setError] = useState("");
  const [styleWarning, setStyleWarning] = useState("");
  const [tab, setTab] = useState<"generate" | "history" | "favorites">("generate");
  const [history, setHistory] = useState<Reply[]>([]);
  const [favorites, setFavorites] = useState<Reply[]>([]);
  const [replyProfiles, setReplyProfiles] = useState<ReplyProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState("");
  const [activeMessages, setActiveMessages] = useState<ProfileMessage[]>([]);
  const [activeMessagesLoading, setActiveMessagesLoading] = useState(false);
  const [showNewProfileModal, setShowNewProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileCategory, setNewProfileCategory] = useState<(typeof categoryOptions)[number] | "">("");
  const [newProfileContext, setNewProfileContext] = useState("");
  const [newProfileChatHistory, setNewProfileChatHistory] = useState("");
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileCategory, setEditProfileCategory] = useState<(typeof categoryOptions)[number] | "">("");
  const [editProfileContext, setEditProfileContext] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [generationAnalyses, setGenerationAnalyses] = useState<ReplyAnalysis[]>([]);
  const [recommendedIndex, setRecommendedIndex] = useState<number | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [quickRewriteLoading, setQuickRewriteLoading] = useState<{ index: number; mode: QuickRewriteMode } | null>(null);
  const [rewriteLoading, setRewriteLoading] = useState<{ index: number; mode: RewriteMode } | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<"rewrite" | "profiles">("rewrite");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>(null);
  const [rewriteCounts, setRewriteCounts] = useState<{ calm: number; assertive: number; strategic: number }>({
    calm: 0,
    assertive: 0,
    strategic: 0,
  });
  const [lastSubmittedInput, setLastSubmittedInput] = useState("");
  const suggestTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isPro = profile.subscription_status === "pro";
  const isPremiumStyle = preTones.includes(tone);

  async function fetchProfiles() {
    setProfilesLoading(true);
    try {
      const response = await fetch("/api/reply-profiles");
      const data = await response.json().catch(() => null);
      if (response.ok && data?.profiles) {
        setReplyProfiles(data.profiles);
        if (!activeProfileId && data.profiles.length > 0) {
          setActiveProfileId(data.profiles[0].id);
        }
      }
    } catch {
      // Silent fail
    } finally {
      setProfilesLoading(false);
    }
  }

  async function fetchActiveMessages(profileId: string) {
    if (!profileId) {
      setActiveMessages([]);
      return;
    }

    setActiveMessagesLoading(true);
    try {
      const response = await fetch(`/api/reply-profiles/messages?profileId=${encodeURIComponent(profileId)}`);
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

  async function createNewProfile() {
    if (!newProfileName.trim()) {
      setError("Profile name is required.");
      return;
    }

    setCreatingProfile(true);
    setError("");
    try {
      const response = await fetch("/api/reply-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileName: newProfileName,
          profileCategory: newProfileCategory || undefined,
          contextNotes: newProfileContext,
          chatHistory: newProfileChatHistory,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (data?.upgrade_required) {
          setUpgradeReason("profiles");
          setShowUpgradeModal(true);
        }
        setError(data?.error || "Could not create profile.");
        return;
      }

      if (data?.profile?.id) {
        const newProfileId = data.profile.id;
        setActiveProfileId(newProfileId);
        setActiveMessages([]);
        setInput("");
        setContext("");
        setOutputs([]);
        setOriginalOutputs([]);
        setToneDetection("");
        setGenerationAnalyses([]);
        setRecommendedIndex(null);
        setShowNewProfileModal(false);
        setNewProfileName("");
        setNewProfileCategory("");
        setNewProfileContext("");
        setNewProfileChatHistory("");
        await fetchProfiles();
      }
    } catch {
      setError("Network error while creating profile.");
    } finally {
      setCreatingProfile(false);
    }
  }

  function getProfileDisplayName(profileItem: ReplyProfile) {
    return profileItem.profile_name || profileItem.contact_name || "Unnamed Profile";
  }

  function getProfileCategory(profileItem: ReplyProfile) {
    return profileItem.profile_category || profileItem.relationship_type || "";
  }

  function openEditProfileModal() {
    const activeProfile = replyProfiles.find((profileItem) => profileItem.id === activeProfileId);
    if (!activeProfile) return;

    setEditProfileName(getProfileDisplayName(activeProfile));
    setEditProfileCategory(getProfileCategory(activeProfile) as (typeof categoryOptions)[number] | "");
    setEditProfileContext(activeProfile.context_notes || "");
    setShowEditProfileModal(true);
  }

  async function saveProfileEdits() {
    if (!activeProfileId) return;
    if (!editProfileName.trim()) {
      setError("Profile name is required.");
      return;
    }

    setUpdatingProfile(true);
    setError("");
    try {
      const response = await fetch("/api/reply-profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: activeProfileId,
          profileName: editProfileName,
          profileCategory: editProfileCategory || undefined,
          contextNotes: editProfileContext,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error || "Could not update profile.");
        return;
      }

      setShowEditProfileModal(false);
      await fetchProfiles();
    } catch {
      setError("Network error while updating profile.");
    } finally {
      setUpdatingProfile(false);
    }
  }

  useEffect(() => {
    if (initialTemplateInput) {
      setInput(initialTemplateInput);
      setTab("generate");
    }
  }, [initialTemplateInput]);

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (activeProfileId) {
      fetchActiveMessages(activeProfileId);
    }
  }, [activeProfileId]);

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

    if (!activeProfileId) {
      setError("Select or create a Reply Profile before generating.");
      return;
    }

    setLoading(true);
    setError("");
    setStyleWarning("");
    setQuickRewriteLoading(null);

    if (input !== lastSubmittedInput) {
      setRewriteCounts({ calm: 0, assertive: 0, strategic: 0 });
      setLastSubmittedInput(input);
    }

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          context,
          tone,
          modifier,
          profileId: activeProfileId || undefined,
          template: selectedTemplate || undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error || "Generation failed.");
        return;
      }

      const resolvedProfileId = data?.profileId || activeProfileId;
      if (resolvedProfileId && resolvedProfileId !== activeProfileId) {
        setActiveProfileId(resolvedProfileId);
      }

      setOutputs(data?.outputs || []);
      setOriginalOutputs(data?.outputs || []);
      setToneDetection(data?.detectedTone || "");
      setGenerationAnalyses(data?.analyses || []);
      setRecommendedIndex(typeof data?.recommendedIndex === "number" ? data.recommendedIndex : null);
      
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
      
      await fetchProfiles();
      if (resolvedProfileId) {
        await fetchActiveMessages(resolvedProfileId);
      }
    } catch {
      setError("Network error while generating response.");
    } finally {
      setLoading(false);
    }
  }

  function getStyleKey(index: number): StyleKey {
    if (index === 1) return "assertive";
    if (index === 2) return "strategic";
    return "calm";
  }

  function canRegenerateStyle(style: StyleKey) {
    return rewriteCounts[style] < maxStyleRegenerations;
  }

  async function regenerateStyle(style: StyleKey) {
    if (!canRegenerateStyle(style)) return;
    if (!activeProfileId) {
      setError("Select or create a Reply Profile before generating.");
      return;
    }

    setStyleRegenerating(style);
    setError("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          context,
          tone,
          profileId: activeProfileId,
          template: selectedTemplate || undefined,
          modifier: `Regenerate ${style} mode with fresh wording while preserving intent and realism.`,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error || "Regeneration failed.");
        return;
      }

      const nextOutputs = data?.outputs || [];
      const targetIndex = style === "calm" ? 0 : style === "assertive" ? 1 : 2;
      if (!nextOutputs[targetIndex]) {
        setError("Regeneration failed.");
        return;
      }

      setOutputs((prev) => {
        const updated = [...prev];
        updated[targetIndex] = nextOutputs[targetIndex];
        return updated;
      });

      setOriginalOutputs((prev) => {
        const updated = [...prev];
        updated[targetIndex] = nextOutputs[targetIndex];
        return updated;
      });

      if (Array.isArray(data?.analyses)) {
        setGenerationAnalyses(data.analyses);
      }
      setRecommendedIndex(typeof data?.recommendedIndex === "number" ? data.recommendedIndex : null);

      setRewriteCounts((prev) => ({
        ...prev,
        [style]: prev[style] + 1,
      }));
    } catch {
      setError("Network error while regenerating style.");
    } finally {
      setStyleRegenerating(null);
    }
  }

  async function rewriteOutput(index: number, mode: RewriteMode) {
    if (!outputs[index]) return;

    if (!isPro) {
      setUpgradeReason("rewrite");
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

  return (
    <div className="space-y-6">
      {!isPro ? (
        <div className="rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-0">
            <p className="text-sm font-medium text-slate-300 md:text-sm">Pro version coming soon. More features arriving soon.</p>
          </div>
        </div>
      ) : null}
      <div className="flex gap-1 border-b border-slate-700 md:gap-2">
        <button
          onClick={() => setTab("generate")}
          className={`h-11 px-4 py-2 text-sm font-medium md:h-auto md:text-base ${tab === "generate" ? "border-b-2 border-sky-500 text-sky-400" : "text-slate-400 hover:text-slate-300"}`}
        >
          Generate
        </button>
        <button
          onClick={() => setTab("history")}
          className={`h-11 px-4 py-2 text-sm font-medium md:h-auto md:text-base ${tab === "history" ? "border-b-2 border-sky-500 text-sky-400" : "text-slate-400 hover:text-slate-300"}`}
        >
          History
        </button>
        <button
          onClick={() => setTab("favorites")}
          className={`h-11 px-4 py-2 text-sm font-medium md:h-auto md:text-base ${tab === "favorites" ? "border-b-2 border-sky-500 text-sky-400" : "text-slate-400 hover:text-slate-300"}`}
        >
          Favorites
        </button>
      </div>
      {tab === "generate" ? (
      <div className="card p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-xl font-semibold md:text-2xl">Reply Workspace</h1>
          <div className="flex items-center gap-2 md:gap-3">
            {isPro ? (
              <span className="rounded-full border border-emerald-700 bg-emerald-900/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 md:px-3 md:text-xs">
                PRO MEMBER
              </span>
            ) : (
              <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[10px] uppercase tracking-wider text-slate-400 md:px-3 md:text-xs">
                FREE PLAN
              </span>
            )}
          </div>
        </div>
        {toneDetection ? <p className="mb-3 text-xs text-sky-400">Detected tone: {toneDetection}</p> : null}
        {error ? <p className="mb-3 text-sm text-rose-400">{error}</p> : null}
        {styleWarning ? <p className="mb-3 text-sm text-amber-400">{styleWarning}</p> : null}
        
        {/* Template Selector */}
        <TemplateSelector
          selectedTemplate={selectedTemplate}
          onSelectTemplate={setSelectedTemplate}
          isPro={isPro}
          onUpgradeClick={handleUpgrade}
        />
        
        <textarea className="min-h-[120px] w-full rounded-md border border-slate-700 bg-slate-950 p-4 text-base md:min-h-28 md:p-3 md:text-sm" placeholder="Paste incoming message" value={input} onChange={(e) => handleInputChange(e.target.value)} />
        <div className="mt-2 text-xs text-slate-400">
          {suggesting ? "✨ Suggesting best tone..." : input.length >= 10 ? "✓ Tone suggested" : ""}
        </div>
        <textarea className="mt-3 min-h-[100px] w-full rounded-md border border-slate-700 bg-slate-950 p-4 text-base md:min-h-20 md:p-3 md:text-sm" placeholder="Optional context" value={context} onChange={(e) => setContext(e.target.value)} />
        <select className="mt-3 h-12 w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-base md:h-auto md:text-sm" value={tone} onChange={(e) => setTone(e.target.value)}>
          <optgroup label="Free">
            {freeTones.map((item) => (<option key={item} value={item}>{item}</option>))}
          </optgroup>
          {isPro && (
            <optgroup label="Pro">
              {preTones.map((item) => (<option key={item} value={item}>{item}</option>))}
            </optgroup>
          )}
        </select>
        {/* Mobile: Sticky Generate Button */}
        <div className="sticky bottom-0 left-0 right-0 z-20 -mx-4 mt-4 border-t border-slate-800 bg-slate-950/95 p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.4)] backdrop-blur md:relative md:mx-0 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
          <button className="h-12 w-full rounded-md bg-sky-500 px-4 py-2 text-base font-medium text-slate-950 disabled:opacity-60 md:h-auto md:w-auto md:text-sm" onClick={() => generate()} disabled={loading}>{loading ? "Generating..." : "Generate Reply"}</button>
        </div>

        {outputs.length ? (
          <div className="mt-6 grid gap-4 md:gap-3">
            {outputs.map((output, index) => (
              <article key={index} className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold md:text-sm">{["Calm", "Assertive", "Strategic"][index] || "Reply"}</h2>
                    {recommendedIndex === index ? (
                      <span className="rounded-full border border-amber-500/60 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                        ⭐ Recommended
                      </span>
                    ) : null}
                  </div>
                  <div className="flex gap-3 md:gap-2">
                    <button className="h-11 text-xs text-sky-400 hover:text-sky-300 md:h-auto" onClick={() => navigator.clipboard.writeText(output)}>Copy</button>
                    <button className="h-11 text-xs text-sky-400 hover:text-sky-300 md:h-auto" onClick={() => shareReply(output)}>Share</button>
                    <button className="hidden h-11 text-xs text-sky-400 hover:text-sky-300 md:inline-block md:h-auto" onClick={() => exportAsImage(output, tone)}>Export</button>
                  </div>
                </div>

                {generationAnalyses[index] ? (
                  <div className="mb-3 rounded-md border border-slate-700 bg-slate-900/40 p-3 text-xs text-slate-300">
                    <p className="text-sm font-semibold text-sky-300">Reply Score: {generationAnalyses[index].reply_score}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <p><span className="text-slate-500">Clarity:</span> {generationAnalyses[index].clarity}</p>
                      <p><span className="text-slate-500">Influence:</span> {generationAnalyses[index].influence}</p>
                      <p><span className="text-slate-500">Pressure:</span> {generationAnalyses[index].pressure_level}</p>
                      <p><span className="text-slate-500">Tone:</span> {generationAnalyses[index].tone_detected}</p>
                    </div>
                    <p className="mt-2">
                      <span className="text-slate-500">Manipulation Risk:</span>{" "}
                      <span
                        className={
                          generationAnalyses[index].manipulation_risk === "High" || generationAnalyses[index].manipulation_risk === "Medium"
                            ? "font-semibold text-rose-400"
                            : "text-green-400"
                        }
                      >
                        {generationAnalyses[index].manipulation_risk}
                      </span>
                    </p>
                  </div>
                ) : null}
                
                {/* Template Badge */}
                {selectedTemplate && index === 0 && (
                  <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs">
                    <span className="text-sky-400">Template:</span>
                    <span className="font-medium text-sky-300">
                      {selectedTemplate === "work" && "Work"}
                      {selectedTemplate === "dating" && "Dating"}
                      {selectedTemplate === "negotiation" && "Negotiation"}
                      {selectedTemplate === "conflict" && "Conflict"}
                      {selectedTemplate === "decline" && "Polite Decline"}
                      {selectedTemplate === "customer_service" && "Customer Service"}
                    </span>
                  </div>
                )}
                
                <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-200 md:text-sm md:leading-normal">{output}</p>

                <div className="mt-3">
                  <button
                    type="button"
                    className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-sky-500 hover:text-sky-300"
                    onClick={() => navigator.clipboard.writeText(output)}
                  >
                    Copy Reply
                  </button>
                </div>

                {index < 3 ? (
                  <div className="mt-3 min-h-[56px] rounded-md border border-slate-700 bg-slate-900/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-400">Refine this mode</p>
                      {canRegenerateStyle(getStyleKey(index)) ? (
                        <button
                          type="button"
                          className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-sky-500 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => regenerateStyle(getStyleKey(index))}
                          disabled={styleRegenerating !== null}
                        >
                          {styleRegenerating === getStyleKey(index)
                            ? "Regenerating..."
                            : `Regenerate (${maxStyleRegenerations - rewriteCounts[getStyleKey(index)]} left)`}
                        </button>
                      ) : null}
                    </div>
                    {!canRegenerateStyle(getStyleKey(index)) ? (
                      <p className="mt-2 text-[11px] text-slate-500">Maximum refinements reached.</p>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-4 rounded-md border border-slate-700 bg-slate-900/40 p-3 md:p-3">
                  <h3 className="text-sm font-semibold text-slate-100">Quick Rewrite</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quickRewriteModes.map((mode) => {
                      const isLoadingMode = quickRewriteLoading?.index === index && quickRewriteLoading?.mode === mode;
                      const isBusy = quickRewriteLoading?.index === index;
                      return (
                        <button
                          key={mode}
                          type="button"
                          className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-sky-500 hover:text-sky-300 disabled:opacity-60 md:h-auto md:px-3 md:text-xs"
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

                <div className="mt-4 rounded-md border border-slate-700 bg-slate-900/40 p-3 md:p-3">
                  <h3 className="text-sm font-semibold text-slate-100">Advanced Rewrite Modes (Pro)</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rewriteModes.map((mode) => {
                      const isLoadingMode = rewriteLoading?.index === index && rewriteLoading?.mode === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          className={`h-11 rounded-md border px-4 py-2 text-sm md:h-auto md:px-3 md:text-xs ${isPro ? "border-slate-600 text-slate-200 hover:border-sky-500 hover:text-sky-300" : "border-slate-700 text-slate-400"}`}
                          onClick={() => rewriteOutput(index, mode)}
                          disabled={isLoadingMode}
                        >
                          {isLoadingMode ? "Rewriting..." : isPro ? mode : `${mode} • 🔒`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        <section className="rounded-md border border-slate-700 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-100">Reply Profiles</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-sky-500 hover:text-sky-300 disabled:opacity-50"
                onClick={openEditProfileModal}
                disabled={!activeProfileId}
              >
                Edit Profile
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-sky-500 hover:text-sky-300"
                onClick={() => setShowNewProfileModal(true)}
              >
                New Profile
              </button>
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs text-slate-400">Active Contact</label>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm"
              value={activeProfileId}
              onChange={(e) => setActiveProfileId(e.target.value)}
            >
              <option value="">Select a profile</option>
              {replyProfiles.map((profileItem) => (
                <option key={profileItem.id} value={profileItem.id}>
                  {getProfileDisplayName(profileItem)}
                  {getProfileCategory(profileItem) ? ` • ${getProfileCategory(profileItem)}` : ""}
                  {` • ${new Date(profileItem.last_activity_at || profileItem.created_at).toLocaleDateString()}`}
                </option>
              ))}
            </select>
          </div>

          {activeProfileId ? (
            <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/60 p-3">
              {(() => {
                const activeProfile = replyProfiles.find((profileItem) => profileItem.id === activeProfileId);
                if (!activeProfile) return null;

                return (
                  <div className="space-y-1 text-xs text-slate-300">
                    {(activeProfile.style_summary || activeProfile.tone_pattern) ? (
                      <span className="inline-flex rounded-full border border-emerald-700/50 bg-emerald-900/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                        Communication Style Learned
                      </span>
                    ) : null}
                    <p>
                      <span className="text-slate-500">Profile:</span> {getProfileDisplayName(activeProfile)}
                    </p>
                    {getProfileCategory(activeProfile) ? (
                      <p>
                        <span className="text-slate-500">Category:</span> {getProfileCategory(activeProfile)}
                      </p>
                    ) : null}
                    {activeProfile.context_notes ? (
                      <p>
                        <span className="text-slate-500">Notes:</span> {activeProfile.context_notes}
                      </p>
                    ) : null}
                    <p>
                      <span className="text-slate-500">Last activity:</span>{" "}
                      {new Date(activeProfile.last_activity_at || activeProfile.created_at).toLocaleString()}
                    </p>
                  </div>
                );
              })()}
            </div>
          ) : null}

          <div className="mt-4 rounded-md border border-slate-800 bg-slate-950/60 p-3">
            {profilesLoading || activeMessagesLoading ? (
              <p className="text-sm text-slate-400">Loading profile memory...</p>
            ) : !activeProfileId ? (
              <p className="text-sm text-slate-400">Create or select a Reply Profile to begin.</p>
            ) : activeMessages.length === 0 ? (
              <p className="text-sm text-slate-400">No saved messages yet for this contact.</p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {activeMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-md px-3 py-2 text-sm ${
                      message.role === "incoming" || message.role === "history_import"
                        ? "mr-8 border border-slate-700 bg-slate-900 text-slate-200"
                        : "ml-8 border border-sky-700/40 bg-sky-900/20 text-sky-100"
                    }`}
                  >
                    <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
                      {message.role === "incoming" && "Incoming"}
                      {message.role === "history_import" && "Imported history"}
                      {message.role === "assistant_suggestion" && "Suggested reply"}
                      {message.role === "user_reply" && "Your sent reply"}
                    </p>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        
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

      {showNewProfileModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-xl rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-slate-100">New Reply Profile</h2>
            <p className="mt-1 text-sm text-slate-400">Create your own named workspace for one real person.</p>

            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-sm"
                placeholder="Profile name (e.g. Sarah, Boss, Client Milan, Mom)"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
              />

              <select
                className="w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-sm"
                value={newProfileCategory}
                onChange={(e) => setNewProfileCategory(e.target.value as (typeof categoryOptions)[number] | "")}
              >
                <option value="">No category (optional)</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <textarea
                className="min-h-[90px] w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-sm"
                placeholder="Optional short context"
                value={newProfileContext}
                onChange={(e) => setNewProfileContext(e.target.value)}
              />

              <textarea
                className="min-h-[120px] w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-sm"
                placeholder="Optional: paste chat history to train style memory"
                value={newProfileChatHistory}
                onChange={(e) => setNewProfileChatHistory(e.target.value)}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                onClick={() => {
                  setShowNewProfileModal(false);
                  setNewProfileName("");
                  setNewProfileCategory("");
                  setNewProfileContext("");
                  setNewProfileChatHistory("");
                }}
                disabled={creatingProfile}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
                onClick={createNewProfile}
                disabled={creatingProfile}
              >
                {creatingProfile ? "Creating..." : "Create Profile"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showEditProfileModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-xl rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-slate-100">Edit Profile</h2>
            <p className="mt-1 text-sm text-slate-400">Rename and personalize this reply workspace.</p>

            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-sm"
                placeholder="Profile name"
                value={editProfileName}
                onChange={(e) => setEditProfileName(e.target.value)}
              />

              <select
                className="w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-sm"
                value={editProfileCategory}
                onChange={(e) => setEditProfileCategory(e.target.value as (typeof categoryOptions)[number] | "")}
              >
                <option value="">No category (optional)</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <textarea
                className="min-h-[100px] w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-sm"
                placeholder="Optional context notes"
                value={editProfileContext}
                onChange={(e) => setEditProfileContext(e.target.value)}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                onClick={() => setShowEditProfileModal(false)}
                disabled={updatingProfile}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
                onClick={saveProfileEdits}
                disabled={updatingProfile}
              >
                {updatingProfile ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showUpgradeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-slate-100">
              {upgradeReason === "profiles" ? "Unlock More Reply Profiles" : "Pro Coming Soon"}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              {upgradeReason === "profiles"
                ? "Free plan includes 1 Reply Profile. Upgrade to Pro to save up to 3 profiles."
                : "Advanced rewrite modes will be available in the Pro version. Stay tuned!"}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              {upgradeReason === "profiles" ? (
                <button
                  type="button"
                  className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950"
                  onClick={handleUpgrade}
                >
                  Upgrade
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                onClick={() => setShowUpgradeModal(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
