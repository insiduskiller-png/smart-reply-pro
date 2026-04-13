"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import EditableReplyPanel from "@/components/editable-reply-panel";
import ProFeaturePreview from "@/components/pro-feature-preview";
import TemplateSelector, { type TemplateType } from "@/components/template-selector";
import { hasProAccess, PRO_ENABLED, PRO_WAITLIST_HREF } from "@/lib/billing";

const freeTones = ["Neutral", "Direct", "Polite", "Friendly", "Confident"];
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
  user_id?: string;
  profile_name: string;
  category?: string | null;
  context_notes?: string | null;
  style_memory?: string | null;
  profile_summary?: string | null;
  interaction_count?: number | null;
  intelligence_model?: unknown;
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

type ReplyCardFeedback = {
  message: string;
  tone: "success" | "info";
};

type GeneratedReplyActionState = {
  replyId?: string;
  savedText?: string;
  favorited?: boolean;
  isProcessing?: boolean;
  feedback?: ReplyCardFeedback | null;
};

type RewriteMode = "Lawyer Mode" | "Negotiator Mode" | "Manager Mode";
type QuickRewriteMode = "Shorter" | "More Direct" | "More Polite" | "More Assertive" | "More Confident";
type StyleKey = "calm" | "assertive" | "strategic";

const rewriteModes: RewriteMode[] = ["Lawyer Mode", "Negotiator Mode", "Manager Mode"];
const quickRewriteModes: QuickRewriteMode[] = ["Shorter", "More Direct", "More Polite", "More Assertive", "More Confident"];
const relationshipTypeOptions = ["Dating", "Work", "Client", "Family", "Friend", "Conflict", "Other"] as const;
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
  const [newProfileRelationshipType, setNewProfileRelationshipType] = useState<(typeof relationshipTypeOptions)[number] | "">("");
  const [newProfileContext, setNewProfileContext] = useState("");
  const [newProfileChatHistory, setNewProfileChatHistory] = useState("");
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileRelationshipType, setEditProfileRelationshipType] = useState<(typeof relationshipTypeOptions)[number] | "">("");
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
  const replyFeedbackTimeoutsRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const [generatedReplyActions, setGeneratedReplyActions] = useState<Record<number, GeneratedReplyActionState>>({});

  const isPro = hasProAccess(profile.subscription_status);
  const isProAvailable = PRO_ENABLED;
  const isPremiumStyle = preTones.includes(tone);

  function setGeneratedReplyAction(index: number, updates: Partial<GeneratedReplyActionState>) {
    setGeneratedReplyActions((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        ...updates,
      },
    }));
  }

  function replaceGeneratedReplyAction(index: number, nextState: GeneratedReplyActionState) {
    setGeneratedReplyActions((prev) => ({
      ...prev,
      [index]: nextState,
    }));
  }

  function clearGeneratedReplyActions() {
    Object.values(replyFeedbackTimeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
    replyFeedbackTimeoutsRef.current = {};
    setGeneratedReplyActions({});
  }

  function getReplyVariantLabel(index: number) {
    return ["Calm", "Assertive", "Strategic"][index] || `Reply ${index + 1}`;
  }

  function showReplyFeedback(index: number, feedback: ReplyCardFeedback) {
    const existingTimeout = replyFeedbackTimeoutsRef.current[index];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    setGeneratedReplyAction(index, { feedback });
    replyFeedbackTimeoutsRef.current[index] = setTimeout(() => {
      setGeneratedReplyAction(index, { feedback: null });
      delete replyFeedbackTimeoutsRef.current[index];
    }, 2200);
  }

  function updateOutputText(index: number, nextText: string) {
    setOutputs((prev) => {
      const next = [...prev];
      next[index] = nextText;
      return next;
    });
  }

  async function copyGeneratedReply(index: number) {
    const replyText = outputs[index];
    if (!replyText) return;

    try {
      await navigator.clipboard.writeText(replyText);
      showReplyFeedback(index, { message: "Copied.", tone: "success" });
    } catch {
      showReplyFeedback(index, { message: "Copy failed.", tone: "info" });
    }
  }

  function openGeneratedReplyEmailDraft(index: number) {
    const replyText = outputs[index];
    if (!replyText || typeof window === "undefined") return;

    const params = new URLSearchParams({
      subject: `Smart Reply Pro • ${getReplyVariantLabel(index)} draft`,
      body: replyText,
    });

    // Use a temporary link element so window.location is never mutated.
    // Mutating window.location.href with a mailto: URI can navigate the page
    // away on browsers/OS configurations that don't handle the scheme natively.
    const link = document.createElement("a");
    link.href = `mailto:?${params.toString()}`;
    link.setAttribute("rel", "noopener noreferrer");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showReplyFeedback(index, { message: "Email draft opened.", tone: "info" });
  }

  async function saveGeneratedReply(index: number) {
    const replyText = outputs[index];
    if (!replyText?.trim()) return;

    // Do not start a save/favorite while generation is already in flight.
    // A concurrent 401 from the save API would redirect to login mid-generation.
    if (loading) {
      showReplyFeedback(index, { message: "Wait for generation to finish.", tone: "info" });
      return;
    }

    const currentState = generatedReplyActions[index];
    const canReuseExistingReply = Boolean(currentState?.replyId) && currentState?.savedText === replyText;

    if (currentState?.favorited && canReuseExistingReply) {
      showReplyFeedback(index, { message: "Already saved.", tone: "success" });
      return;
    }

    setGeneratedReplyAction(index, { isProcessing: true });

    try {
      let replyId = canReuseExistingReply ? currentState?.replyId : undefined;

      if (!replyId) {
        const saveResponse = await fetch("/api/replies/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input,
            context: context || undefined,
            tone: `${tone} • ${getReplyVariantLabel(index)}`,
            reply: replyText,
          }),
        });

        const savePayload = await saveResponse.json().catch(() => null);
        if (saveResponse.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (!saveResponse.ok || !savePayload?.reply?.id) {
          throw new Error(savePayload?.error || "Unable to save reply.");
        }

        replyId = savePayload.reply.id as string;
      }

      const favoriteResponse = await fetch("/api/replies/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId, favorite: true }),
      });
      const favoritePayload = await favoriteResponse.json().catch(() => null);

      if (favoriteResponse.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!favoriteResponse.ok) {
        throw new Error(favoritePayload?.error || "Unable to favorite reply.");
      }

      replaceGeneratedReplyAction(index, {
        replyId,
        savedText: replyText,
        favorited: true,
        isProcessing: false,
        feedback: { message: "Saved.", tone: "success" },
      });

      showReplyFeedback(index, { message: "Saved.", tone: "success" });
    } catch {
      setGeneratedReplyAction(index, { isProcessing: false });
      showReplyFeedback(index, { message: "Save failed.", tone: "info" });
    }
  }

  useEffect(() => {
    return () => {
      Object.values(replyFeedbackTimeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, []);

  async function fetchProfiles(preferredProfileId?: string) {
    setProfilesLoading(true);
    try {
      const response = await fetch("/api/reply-profiles");
      const data = await response.json().catch(() => null);
      if (response.ok && data?.profiles) {
        console.info("[UI][fetchProfiles] loaded", {
          count: data.profiles.length,
          preferredProfileId: preferredProfileId || null,
        });
        setReplyProfiles(data.profiles);
        setActiveProfileId((current) => {
          if (preferredProfileId && data.profiles.some((p: { id: string }) => p.id === preferredProfileId)) {
            console.info("[UI][fetchProfiles] selecting preferred profile", { preferredProfileId });
            return preferredProfileId;
          }

          if (current && data.profiles.some((p: { id: string }) => p.id === current)) {
            return current;
          }

          const fallbackId = data.profiles[0]?.id || "";
          if (fallbackId) {
            console.info("[UI][fetchProfiles] selecting fallback profile", { fallbackId });
          }
          return fallbackId;
        });
      }
    } catch (err) {
      console.error("[UI][fetchProfiles] failed", err);
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
    console.info("[UI][createNewProfile] submit", {
      profile_name: newProfileName,
      category: newProfileRelationshipType || null,
      contextLength: newProfileContext.length,
      historyLength: newProfileChatHistory.length,
    });

    try {
      const formPayload = {
        profile_name: newProfileName,
        category: newProfileRelationshipType || undefined,
        context_notes: newProfileContext,
        style_memory: newProfileChatHistory,
      };

      console.info("[UI][createNewProfile] payload before submit", formPayload);

      const response = await fetch("/api/reply-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formPayload),
      });

      const data = await response.json().catch(() => null);
      console.info("[UI][createNewProfile] response", {
        status: response.status,
        ok: response.ok,
        hasProfile: Boolean(data?.profile?.id),
        error: data?.error,
      });

      if (!response.ok) {
        if (data?.upgrade_required || data?.coming_soon || response.status === 403) {
          setUpgradeReason("profiles");
          setShowUpgradeModal(true);
        }
        console.error("[UI][createNewProfile] failed", data);
        setError(data?.error || "Could not create profile.");
        return;
      }

      if (data?.profile?.id) {
        const createdProfile = data.profile as ReplyProfile;
        const newProfileId = createdProfile.id;
        console.info("[UI][createNewProfile] success", { newProfileId });

        setReplyProfiles((prev) => {
          const exists = prev.some((profileItem) => profileItem.id === newProfileId);
          return exists ? prev : [createdProfile, ...prev];
        });

        setActiveProfileId(newProfileId);
        console.info("[UI][createNewProfile] selected profile set", { newProfileId });
        setActiveMessages([]);
        setInput("");
        setContext("");
        setOutputs([]);
        setOriginalOutputs([]);
        clearGeneratedReplyActions();
        setToneDetection("");
        setGenerationAnalyses([]);
        setRecommendedIndex(null);
        setShowNewProfileModal(false);
        setNewProfileName("");
        setNewProfileRelationshipType("");
        setNewProfileContext("");
        setNewProfileChatHistory("");
        await fetchProfiles(newProfileId);
      } else {
        console.error("[UI][createNewProfile] missing profile id", data);
        setError("Could not create profile. Please try again.");
      }
    } catch (err) {
      console.error("[UI][createNewProfile] network/error", err);
      setError("Network error while creating profile.");
    } finally {
      setCreatingProfile(false);
    }
  }

  function getProfileDisplayName(profileItem: ReplyProfile) {
    return profileItem.profile_name || "Unnamed Profile";
  }

  function getProfileRelationshipType(profileItem: ReplyProfile) {
    return profileItem.category || "";
  }

  function openEditProfileModal() {
    const activeProfile = replyProfiles.find((profileItem) => profileItem.id === activeProfileId);
    if (!activeProfile) return;

    setEditProfileName(getProfileDisplayName(activeProfile));
    setEditProfileRelationshipType(getProfileRelationshipType(activeProfile) as (typeof relationshipTypeOptions)[number] | "");
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
          profile_name: editProfileName,
          category: editProfileRelationshipType || undefined,
          context_notes: editProfileContext,
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
    setUpgradeReason("rewrite");
    setShowUpgradeModal(true);
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
        setStyleWarning(isProAvailable ? "This style requires Pro plan." : "Advanced styles will be available in Pro.");
    }

    if (!activeProfileId) {
      setError("Select or create a Reply Profile before generating.");
      return;
    }

    setLoading(true);
    setError("");
    setStyleWarning("");
    setQuickRewriteLoading(null);
    clearGeneratedReplyActions();

    if (input !== lastSubmittedInput) {
      setRewriteCounts({ calm: 0, assertive: 0, strategic: 0 });
      setLastSubmittedInput(input);
    }

    console.info("[generate] started", {
      profileId: activeProfileId,
      tone,
      hasInput: Boolean(input?.trim()),
      hasContext: Boolean(context?.trim()),
    });

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

      console.info("[generate] response", { status: response.status, ok: response.ok });

      const data = await response.json().catch(() => null);

      // Session expired or cookie missing – redirect cleanly instead of
      // surfacing the raw "Unauthorized" API error string to the user.
      if (response.status === 401) {
        console.info("[generate] 401 – session expired, redirecting to login");
        if (typeof window !== "undefined") {
          window.location.href = "/login?expired=1";
        }
        return;
      }

      if (!response.ok) {
        console.info("[generate] error", { status: response.status, error: data?.error });
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
          const saveResponse = await fetch("/api/replies/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input,
              context: context || undefined,
              tone,
              reply: data.outputs[0],
            }),
          });
          const savePayload = await saveResponse.json().catch(() => null);
          if (saveResponse.ok && savePayload?.reply?.id) {
            replaceGeneratedReplyAction(0, {
              replyId: savePayload.reply.id as string,
              savedText: data.outputs[0],
              favorited: false,
              isProcessing: false,
              feedback: null,
            });
          }
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

      setGeneratedReplyAction(targetIndex, { favorited: false });

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

      setGeneratedReplyAction(index, { favorited: false });

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
    const sourceReply = outputs[index] ?? originalOutputs[index];
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

      setGeneratedReplyAction(index, { favorited: false });
    } catch {
      setError("Network error while quick rewriting.");
    } finally {
      setQuickRewriteLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {!isPro ? (
        <div className="rounded-lg border border-sky-500/30 bg-gradient-to-r from-sky-900/40 via-slate-900 to-slate-900 p-4 shadow-md">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-0">
            <div>
              <p className="text-sm font-semibold text-sky-300">
                ✨ Free Smart Reply Pro is ready to use
              </p>
              <p className="mt-1 text-xs text-slate-300">
                {isProAvailable
                  ? "Get specialized replies with quick refinement tools. Upgrade for advanced rewrite modes and more profiles."
                  : "Get specialized replies with quick refinement tools."}
              </p>
            </div>
            {!isProAvailable ? (
              <Link href={PRO_WAITLIST_HREF} className="whitespace-nowrap text-xs font-semibold text-sky-300 hover:text-sky-200 md:text-sm">
                Join Waitlist →
              </Link>
            ) : null}
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

        <section className="mt-4 rounded-md border border-slate-700 bg-slate-900/40 p-4">
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

          {!isPro && !isProAvailable ? (
            <p className="mt-3 text-xs text-slate-400">
              Free launch currently supports 1 Reply Profile. More profile slots are planned for the Pro release.
            </p>
          ) : null}

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
                  {getProfileRelationshipType(profileItem) ? ` • ${getProfileRelationshipType(profileItem)}` : ""}
                  {` • ${new Date(profileItem.created_at).toLocaleDateString()}`}
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
                    {activeProfile.style_memory ? (
                      <span className="inline-flex rounded-full border border-emerald-700/50 bg-emerald-900/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                        Communication Style Learned
                      </span>
                    ) : null}
                    <p>
                      <span className="text-slate-500">Profile:</span> {getProfileDisplayName(activeProfile)}
                    </p>
                    {getProfileRelationshipType(activeProfile) ? (
                      <p>
                        <span className="text-slate-500">Relationship:</span> {getProfileRelationshipType(activeProfile)}
                      </p>
                    ) : null}
                    {activeProfile.context_notes ? (
                      <p>
                        <span className="text-slate-500">Notes:</span> {activeProfile.context_notes}
                      </p>
                    ) : null}
                    <p>
                      <span className="text-slate-500">Last activity:</span>{" "}
                      {new Date(activeProfile.created_at).toLocaleString()}
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
        
        <textarea className="mt-4 min-h-[120px] w-full rounded-md border border-slate-700 bg-slate-950 p-4 text-base md:min-h-28 md:p-3 md:text-sm" placeholder="Paste incoming message" value={input} onChange={(e) => handleInputChange(e.target.value)} />
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

        {!outputs.length && !loading ? (
          <div className="mt-8 rounded-lg border border-sky-500/20 bg-gradient-to-br from-sky-900/20 via-slate-900/40 to-slate-950 p-6 md:p-8">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold text-white">Ready to craft your first reply?</h2>
              <p className="mt-3 text-base leading-relaxed text-slate-300">
                Paste a message you received, add context about the conversation, and Smart Reply Pro will generate three personalized perspectives: calm, assertive, and strategic.
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">1</div>
                  <div>
                    <p className="font-medium text-slate-100">Paste the message you received</p>
                    <p className="text-sm text-slate-400">Use the text box at the top to share the message you're replying to.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">2</div>
                  <div>
                    <p className="font-medium text-slate-100">Add context (optional)</p>
                    <p className="text-sm text-slate-400">Tell Smart Reply Pro about the relationship or situation for smarter replies.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">3</div>
                  <div>
                    <p className="font-medium text-slate-100">Click "Generate Reply"</p>
                    <p className="text-sm text-slate-400">Get three thoughtful perspectives tailored to your situation.</p>
                  </div>
                </div>
              </div>
              <p className="mt-6 text-sm text-slate-400">
                💡 <span className="font-medium text-slate-300">Pro Tip:</span> Use Reply Profiles to save your communication style and get even better replies over time.
              </p>
            </div>
          </div>
        ) : null}

        {outputs.length ? (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Your Replies</h2>
              <p className="text-xs text-slate-500">3 refined perspectives</p>
            </div>
            <div className="grid gap-4">
            {outputs.map((output, index) => (
              <article key={index} className="card overflow-hidden border border-slate-600 bg-gradient-to-br from-slate-900/80 to-slate-950 shadow-lg">
                <div className="border-b border-slate-700 bg-slate-900/40 p-3 md:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-500/20 text-sky-400">
                        {index === 0 && "😊"}
                        {index === 1 && "💪"}
                        {index === 2 && "🎯"}
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-slate-100">{["Calm", "Assertive", "Strategic"][index] || "Reply"}</h2>
                        <p className="text-xs text-slate-400">
                          {index === 0 && "Steady and composed"}
                          {index === 1 && "Direct and confident"}
                          {index === 2 && "Persuasive and strategic"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {recommendedIndex === index ? (
                        <span className="rounded-full border border-amber-500/60 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                          ⭐ Best Match
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="p-4 md:p-4">
                  {generationAnalyses[index] ? (
                    <div className="mb-4 rounded-md border border-slate-700/50 bg-slate-950/40 p-3 text-xs text-slate-300">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-sky-400">Quality Metrics</p>
                        <p className="text-sm font-bold text-sky-300">Score: {generationAnalyses[index].reply_score}/100</p>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                        <p><span className="text-slate-500">Clarity:</span> <span className="text-slate-300">{generationAnalyses[index].clarity}</span></p>
                        <p><span className="text-slate-500">Influence:</span> <span className="text-slate-300">{generationAnalyses[index].influence}</span></p>
                        <p><span className="text-slate-500">Pressure:</span> <span className="text-slate-300">{generationAnalyses[index].pressure_level}</span></p>
                        <p><span className="text-slate-500">Detected:</span> <span className="text-slate-300">{generationAnalyses[index].tone_detected}</span></p>
                      </div>
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
                  
                  <EditableReplyPanel
                    text={output}
                    onTextChange={(nextText) => updateOutputText(index, nextText)}
                    onCopy={() => copyGeneratedReply(index)}
                    onSave={() => saveGeneratedReply(index)}
                    onOpenEmailDraft={() => openGeneratedReplyEmailDraft(index)}
                    isSaving={Boolean(generatedReplyActions[index]?.isProcessing)}
                    isSaved={Boolean(generatedReplyActions[index]?.favorited && generatedReplyActions[index]?.savedText === output)}
                    feedback={generatedReplyActions[index]?.feedback ?? null}
                  />

                    <div className="space-y-3">
                    <div className="rounded-md border border-slate-600 bg-slate-900/60 p-3 shadow-sm">
                      <h3 className="text-sm font-semibold text-sky-300">✨ Refine This Reply</h3>
                      <p className="mt-1 text-xs text-slate-400">Adjust tone and length in seconds</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {quickRewriteModes.map((mode) => {
                          const isLoadingMode = quickRewriteLoading?.index === index && quickRewriteLoading?.mode === mode;
                          const isBusy = quickRewriteLoading?.index === index;
                          return (
                            <button
                              key={mode}
                              type="button"
                              className="inline-flex h-10 items-center gap-2 rounded-md border border-sky-600/40 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:border-sky-500 hover:bg-sky-500/20 hover:text-sky-200 disabled:opacity-50 transition-all"
                              onClick={() => quickRewriteOutput(index, mode)}
                              disabled={isBusy}
                            >
                              {isLoadingMode ? <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-sky-300 border-t-transparent" /> : null}
                              {isLoadingMode ? "Rewriting..." : mode}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-md border border-slate-700 bg-slate-900/40 p-3">
                      <h3 className="text-sm font-semibold text-slate-100">
                        {isProAvailable ? "Advanced Rewrite Modes (Pro)" : "Advanced Modes (Pro Launch)"}
                      </h3>
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
                              {isLoadingMode ? "Rewriting..." : isPro ? mode : `${mode} • ${isProAvailable ? "🔒" : "Soon"}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
            </div>
          </div>
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

      {showNewProfileModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-xl rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-slate-100">New Reply Profile</h2>
            <p className="mt-1 text-sm text-slate-400">Create your own named workspace for one real person.</p>
            {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}

            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-sm"
                placeholder="Profile name (e.g. Sarah, Boss, Client Milan, Mom)"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
              />

              <select
                className="w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-sm"
                value={newProfileRelationshipType}
                onChange={(e) => setNewProfileRelationshipType(e.target.value as (typeof relationshipTypeOptions)[number] | "")}
              >
                <option value="">No relationship type (optional)</option>
                {relationshipTypeOptions.map((relationshipType) => (
                  <option key={relationshipType} value={relationshipType}>
                    {relationshipType}
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
                  setNewProfileRelationshipType("");
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
                value={editProfileRelationshipType}
                onChange={(e) => setEditProfileRelationshipType(e.target.value as (typeof relationshipTypeOptions)[number] | "")}
              >
                <option value="">No relationship type (optional)</option>
                {relationshipTypeOptions.map((relationshipType) => (
                  <option key={relationshipType} value={relationshipType}>
                    {relationshipType}
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
              {upgradeReason === "profiles"
                ? isProAvailable
                  ? "Unlock More Reply Profiles"
                  : "More Reply Profiles in Pro"
                : isProAvailable
                  ? "Upgrade to Pro"
                  : "Pro Launch Coming"}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              {upgradeReason === "profiles"
                ? isProAvailable
                  ? "Free plan includes 1 Reply Profile. Upgrade to Pro to save up to 3 profiles."
                  : "Free launch includes 1 Reply Profile. Additional profile capacity is planned for the upcoming Pro release."
                : isProAvailable
                  ? "Advanced rewrite modes are available with Pro access."
                  : "Advanced rewrite modes will arrive with the upcoming Pro release. Join the waitlist to get notified."}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              {isProAvailable ? (
                <Link
                  href="/pricing"
                  className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950"
                >
                  Upgrade
                </Link>
              ) : (
                <>
                  <span className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300">
                    Pro Launch
                  </span>
                  <Link
                    href={PRO_WAITLIST_HREF}
                    className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950"
                  >
                    Join Waitlist
                  </Link>
                </>
              )}
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
