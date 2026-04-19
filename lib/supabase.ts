import { createClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from "./env";

export const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const supabaseService = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function headers(apiKey: string, bearer?: string) {
  return {
    apikey: apiKey,
    Authorization: `Bearer ${bearer ?? apiKey}`,
    "Content-Type": "application/json",
  };
}

export async function supabasePasswordLogin(email: string, password: string) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: headers(supabaseAnonKey),
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Invalid email/password");
  return response.json();
}

export async function getSupabaseUser(accessToken: string) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: headers(supabaseAnonKey, accessToken),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unauthorized");
  return response.json();
}

export async function patchUserProfile(userId: string, values: Record<string, unknown>) {
  const { error } = await supabaseService
    .from("profiles")
    .update(values)
    .eq("id", userId);

  if (error) {
    console.error("Error updating profile:", error);
  }
}

export async function patchUserProfileByStripeCustomerId(
  stripeCustomerId: string,
  values: Record<string, unknown>,
) {
  const { error } = await supabaseService
    .from("profiles")
    .update(values)
    .eq("stripe_customer_id", stripeCustomerId);

  if (error) {
    console.error("Error updating profile by stripe customer id:", error);
  }
}

export async function insertGeneration(values: Record<string, unknown>) {
  const { error } = await supabaseService
    .from("generations")
    .insert(values);

  if (error) {
    console.error("Error inserting generation:", error);
  }
}

export async function insertConversation(values: Record<string, unknown>) {
  const { error } = await supabaseService
    .from("conversations")
    .insert(values);

  if (error) {
    console.error("Error inserting conversation:", error);
  }
}

export async function getReplyProfileCountByUser(userId: string) {
  const { count, error } = await supabaseService
    .from("reply_profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.error("Error counting reply profiles:", error);
    return 0;
  }

  return count ?? 0;
}

export async function createReplyProfile(params: {
  userId: string;
  profileName: string;
  category?: string;
  contextNotes?: string;
  styleMemory?: string;
  profileSummary?: string;
}) {
  const now = new Date().toISOString();
  const primaryPayload = {
    user_id: params.userId,
    profile_name: params.profileName,
    category: params.category ?? null,
    context_notes: params.contextNotes ?? null,
    style_memory: params.styleMemory ?? null,
    profile_summary: params.profileSummary ?? null,
    interaction_count: 0,
    created_at: now,
  };

  console.info("[createReplyProfile] Canonical payload before insert", {
    user_id: primaryPayload.user_id,
    profile_name: primaryPayload.profile_name,
    category: primaryPayload.category,
    context_notes: primaryPayload.context_notes,
    style_memory: primaryPayload.style_memory,
    profile_summary: primaryPayload.profile_summary,
    interaction_count: primaryPayload.interaction_count,
    created_at: primaryPayload.created_at,
  });

  if (!primaryPayload.user_id || !primaryPayload.profile_name) {
    console.error("[createReplyProfile] Missing required canonical field", {
      missing: [
        !primaryPayload.user_id ? "user_id" : null,
        !primaryPayload.profile_name ? "profile_name" : null,
      ].filter(Boolean),
      payload: primaryPayload,
    });
  }

  const primary = await supabaseService
    .from("reply_profiles")
    .insert(primaryPayload)
    .select("*")
    .single();

  console.info("[createReplyProfile] Primary response", {
    data: primary.data,
    error: primary.error,
  });

  if (!primary.error && primary.data) {
    console.info("[createReplyProfile] Primary insert success", { id: primary.data.id });
    return {
      profile: primary.data,
      error: null,
    };
  }

  console.error("[createReplyProfile] Primary insert failed", primary.error);

  // Fallback for partially-migrated schemas (legacy columns only)
  const fallbackPayload = {
    user_id: params.userId,
    profile_name: params.profileName,
    category: params.category ?? null,
    context_notes: params.contextNotes ?? null,
    style_memory: params.styleMemory ?? null,
    created_at: now,
  };

  console.info("[createReplyProfile] Attempting fallback insert", fallbackPayload);

  const fallback = await supabaseService
    .from("reply_profiles")
    .insert(fallbackPayload)
    .select("*")
    .single();

  console.info("[createReplyProfile] Fallback response", {
    data: fallback.data,
    error: fallback.error,
  });

  if (fallback.error) {
    console.error("[createReplyProfile] Fallback insert failed", fallback.error);
    return {
      profile: null,
      error: {
        code: fallback.error.code,
        message: fallback.error.message,
        details: fallback.error.details,
        hint: fallback.error.hint,
      },
    };
  }

  console.info("[createReplyProfile] Fallback insert success", { id: fallback.data?.id });
  return {
    profile: fallback.data,
    error: null,
  };
}

export async function getReplyProfilesByUser(userId: string) {
  const primary = await supabaseService
    .from("reply_profiles")
    .select("id, user_id, profile_name, category, context_notes, style_memory, profile_summary, interaction_count, intelligence_model, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!primary.error) {
    return primary.data ?? [];
  }

  console.error("Error fetching reply profiles (primary):", primary.error);

  const fallback = await supabaseService
    .from("reply_profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (fallback.error) {
    console.error("Error fetching reply profiles (fallback):", fallback.error);
    return [];
  }

  return fallback.data ?? [];
}

export async function getReplyProfileById(profileId: string, userId: string) {
  const primary = await supabaseService
    .from("reply_profiles")
    .select("id, user_id, profile_name, category, context_notes, style_memory, profile_summary, interaction_count, intelligence_model, created_at")
    .eq("id", profileId)
    .eq("user_id", userId)
    .single();

  if (!primary.error) {
    return primary.data;
  }

  const fallback = await supabaseService
    .from("reply_profiles")
    .select("*")
    .eq("id", profileId)
    .eq("user_id", userId)
    .single();

  if (fallback.error) {
    console.error("Error fetching reply profile by id:", fallback.error);
    return null;
  }

  return fallback.data;
}

export async function updateReplyProfileDetails(params: {
  profileId: string;
  userId: string;
  profileName: string;
  category?: string | null;
  contextNotes?: string | null;
}) {
  const { data, error } = await supabaseService
    .from("reply_profiles")
    .update({
      profile_name: params.profileName,
      category: params.category ?? null,
      context_notes: params.contextNotes ?? null,
    })
    .eq("id", params.profileId)
    .eq("user_id", params.userId)
    .select("id, user_id, profile_name, category, context_notes, style_memory, created_at")
    .single();

  if (error) {
    console.error("Error updating reply profile details:", error);
    return null;
  }

  return data;
}

export async function updateReplyProfileStyleSummary(params: {
  profileId: string;
  userId: string;
  styleMemory: string;
}) {
  const { error } = await supabaseService
    .from("reply_profiles")
    .update({
      style_memory: params.styleMemory,
    })
    .eq("id", params.profileId)
    .eq("user_id", params.userId);

  if (error) {
    console.error("Error updating reply profile style summary:", error);
  }
}

export async function updateReplyProfileStyleMemory(params: {
  profileId: string;
  userId: string;
  styleMemory?: string;
}) {
  const { data, error } = await supabaseService
    .from("reply_profiles")
    .update({
      style_memory: params.styleMemory ?? null,
    })
    .eq("id", params.profileId)
    .eq("user_id", params.userId)
    .select("id, style_memory")
    .single();

  if (error) {
    console.error("Error updating reply profile style memory:", error);
    return null;
  }

  return data;
}

export async function updateReplyProfileSummary(params: {
  profileId: string;
  userId: string;
  profileSummary?: string | null;
}) {
  const { data, error } = await supabaseService
    .from("reply_profiles")
    .update({
      profile_summary: params.profileSummary ?? null,
    })
    .eq("id", params.profileId)
    .eq("user_id", params.userId)
    .select("id, profile_summary")
    .single();

  if (error) {
    console.error("Error updating reply profile summary:", error);
    return null;
  }

  return data;
}

export async function incrementReplyProfileInteraction(params: {
  profileId: string;
  userId: string;
}) {
  const selected = await supabaseService
    .from("reply_profiles")
    .select("interaction_count")
    .eq("id", params.profileId)
    .eq("user_id", params.userId)
    .single();

  if (selected.error) {
    console.error("Error reading reply profile interaction count:", selected.error);
    return null;
  }

  const nextCount = Number(selected.data?.interaction_count ?? 0) + 1;
  const { data, error } = await supabaseService
    .from("reply_profiles")
    .update({ interaction_count: nextCount })
    .eq("id", params.profileId)
    .eq("user_id", params.userId)
    .select("id, interaction_count")
    .single();

  if (error) {
    console.error("Error incrementing reply profile interaction count:", error);
    return null;
  }

  return data;
}

export async function touchReplyProfileActivity(profileId: string, userId: string) {
  await supabaseService
    .from("reply_profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", profileId)
    .eq("user_id", userId);
}

export async function insertProfileMessage(params: {
  profileId: string;
  userId: string;
  role: "incoming" | "user_reply" | "assistant_suggestion" | "history_import";
  content: string;
  generationId?: string;
  selectedOptionIndex?: number;
}) {
  const { data, error } = await supabaseService
    .from("profile_messages")
    .insert({
      profile_id: params.profileId,
      user_id: params.userId,
      role: params.role,
      content: params.content,
      ...(params.generationId ? { generation_id: params.generationId } : {}),
      ...(params.selectedOptionIndex !== undefined ? { selected_option_index: params.selectedOptionIndex } : {}),
    })
    .select("id, profile_id, user_id, role, content, created_at")
    .single();

  if (error) {
    console.error("Error inserting profile message:", error);
    return null;
  }

  return data;
}

export async function getProfileMessagesByProfile(params: {
  profileId: string;
  userId: string;
  limit?: number;
}) {
  const { data, error } = await supabaseService
    .from("profile_messages")
    .select("id, profile_id, role, content, created_at")
    .eq("profile_id", params.profileId)
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 100);

  if (error) {
    console.error("Error fetching profile messages:", error);
    return [];
  }

  return data ?? [];
}

export async function getProfileMessageCount(params: {
  profileId: string;
  userId: string;
}) {
  const { count, error } = await supabaseService
    .from("profile_messages")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", params.profileId)
    .eq("user_id", params.userId);

  if (error) {
    console.error("Error counting profile messages:", error);
    return 0;
  }

  return count ?? 0;
}

export async function createConversationThread(params: {
  userId: string;
  title?: string;
}) {
  const { data, error } = await supabaseService
    .from("conversation_threads")
    .insert({
      user_id: params.userId,
      title: params.title ?? "New Conversation",
    })
    .select("id, user_id, title, created_at")
    .single();

  if (error) {
    console.error("Error creating conversation thread:", error);
    return null;
  }

  return data;
}

export async function getConversationThreadById(threadId: string, userId: string) {
  const { data, error } = await supabaseService
    .from("conversation_threads")
    .select("id, user_id, title, created_at")
    .eq("id", threadId)
    .eq("user_id", userId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function getConversationThreadsByUser(userId: string) {
  const { data, error } = await supabaseService
    .from("conversation_threads")
    .select("id, title, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Error fetching conversation threads:", error);
    return [];
  }

  return data ?? [];
}

export async function insertConversationMessage(params: {
  threadId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
}) {
  const { data, error } = await supabaseService
    .from("conversation_messages")
    .insert({
      thread_id: params.threadId,
      user_id: params.userId,
      role: params.role,
      content: params.content,
    })
    .select("id, thread_id, user_id, role, content, created_at")
    .single();

  if (error) {
    console.error("Error inserting conversation message:", error);
    return null;
  }

  return data;
}

export async function getConversationMessagesByThread(params: {
  threadId: string;
  userId: string;
  limit?: number;
}) {
  const { data, error } = await supabaseService
    .from("conversation_messages")
    .select("id, thread_id, role, content, created_at")
    .eq("thread_id", params.threadId)
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 50);

  if (error) {
    console.error("Error fetching conversation messages:", error);
    return [];
  }

  return data ?? [];
}

// ─── User Preference State ────────────────────────────────────────────────────

export type UserPreferenceState = {
  preferred_tones: Record<string, number>;
  preferred_variants: Record<string, number>;
  option_index_counts: Record<string, number>;
  context_preferences: Record<string, Record<string, number>>;
  total_selections: number;
};

export async function getUserPreferenceState(userId: string): Promise<UserPreferenceState | null> {
  const { data, error } = await supabaseService
    .from("user_preference_state")
    .select("preferred_tones, preferred_variants, option_index_counts, context_preferences, total_selections")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data as UserPreferenceState;
}

export async function upsertUserPreferenceState(params: {
  userId: string;
  selectedTone: string;
  selectedVariant: string;
  selectedOptionIndex: number;
  contextCategory: string;
}) {
  // Fetch existing state first
  const existing = await getUserPreferenceState(params.userId);

  const tones = { ...(existing?.preferred_tones ?? {}) };
  tones[params.selectedTone] = (tones[params.selectedTone] ?? 0) + 1;

  const variants = { ...(existing?.preferred_variants ?? {}) };
  variants[params.selectedVariant] = (variants[params.selectedVariant] ?? 0) + 1;

  const optionCounts = { ...(existing?.option_index_counts ?? { "0": 0, "1": 0, "2": 0 }) };
  const idxKey = String(params.selectedOptionIndex);
  optionCounts[idxKey] = (Number(optionCounts[idxKey] ?? 0)) + 1;

  const contextPrefs = { ...(existing?.context_preferences ?? {}) };
  if (!contextPrefs[params.contextCategory]) contextPrefs[params.contextCategory] = {};
  contextPrefs[params.contextCategory][params.selectedTone] =
    (contextPrefs[params.contextCategory][params.selectedTone] ?? 0) + 1;

  const totalSelections = (existing?.total_selections ?? 0) + 1;

  const { error } = await supabaseService
    .from("user_preference_state")
    .upsert(
      {
        user_id: params.userId,
        preferred_tones: tones,
        preferred_variants: variants,
        option_index_counts: optionCounts,
        context_preferences: contextPrefs,
        total_selections: totalSelections,
        last_updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) {
    console.error("Error upserting user preference state:", error);
  }
}

// ─── Profile Intelligence Model (contact behaviour patterns) ─────────────────

export async function updateProfileIntelligenceModel(params: {
  profileId: string;
  userId: string;
  analysis: {
    intent: string;
    pressure_level: string;
    manipulation_signals: string[];
    respect_level: string;
    emotional_state: string;
  };
}) {
  // Fetch current model
  const { data: current } = await supabaseService
    .from("reply_profiles")
    .select("intelligence_model, interaction_count")
    .eq("id", params.profileId)
    .eq("user_id", params.userId)
    .single();

  const existingModel = (current?.intelligence_model ?? {}) as Record<string, unknown>;
  const interactionCount = Number(current?.interaction_count ?? 0);

  // Accumulate pattern counts
  const patterns = (existingModel.contact_patterns as Record<string, unknown>) ?? {};

  // Tally intent frequency
  const intentFreq = (patterns.intent_frequency as Record<string, number>) ?? {};
  intentFreq[params.analysis.intent] = (intentFreq[params.analysis.intent] ?? 0) + 1;

  // Tally emotional state frequency
  const emotionFreq = (patterns.emotional_state_frequency as Record<string, number>) ?? {};
  emotionFreq[params.analysis.emotional_state] = (emotionFreq[params.analysis.emotional_state] ?? 0) + 1;

  // Accumulate manipulation signals
  const allTactics = ((patterns.observed_tactics as string[]) ?? []);
  for (const tactic of params.analysis.manipulation_signals) {
    if (!allTactics.includes(tactic)) allTactics.push(tactic);
  }

  // Track rolling pressure level (last 10)
  const pressureHistory = ((patterns.pressure_history as string[]) ?? []);
  pressureHistory.push(params.analysis.pressure_level);
  if (pressureHistory.length > 10) pressureHistory.shift();

  const updatedModel = {
    ...existingModel,
    contact_patterns: {
      ...patterns,
      intent_frequency: intentFreq,
      emotional_state_frequency: emotionFreq,
      observed_tactics: allTactics,
      pressure_history: pressureHistory,
    },
    interaction_count: interactionCount,
    last_updated_at: new Date().toISOString(),
  };

  await supabaseService
    .from("reply_profiles")
    .update({ intelligence_model: updatedModel })
    .eq("id", params.profileId)
    .eq("user_id", params.userId);
}

// ─── Phase 2: User Learned Style ──────────────────────────────────────────────

import {
  DEFAULT_STYLE_TRAITS,
  LearnedStyleTraits,
  UserLearnedStyle,
  mapStyleMemoryToTraits,
  mergeTraitObservation,
  TraitDelta,
  applyTraitDelta,
} from "./style-learning";

/**
 * Fetches the user's cross-profile learned style state.
 * Returns null if no row exists yet (first-time user or never seeded).
 */
export async function getUserLearnedStyle(userId: string): Promise<UserLearnedStyle | null> {
  const { data, error } = await supabaseService
    .from("user_learned_style")
    .select("traits, observation_count")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    traits: (data.traits as LearnedStyleTraits) ?? DEFAULT_STYLE_TRAITS,
    observation_count: data.observation_count ?? 0,
  };
}

/**
 * Seeds / updates the user's learned style from a fresh generateStyleSummary() JSON.
 *
 * Called fire-and-forget after each style refresh in the generate route.
 * Safe to call concurrently — upsert conflict on user_id.
 *
 * @param userId    - the authenticated user's UUID
 * @param styleJson - the full parsed JSON from generateStyleSummary()
 */
export async function seedUserLearnedStyle(
  userId: string,
  styleJson: Record<string, string>,
): Promise<void> {
  // Map the style summary JSON to trait scores
  const incomingTraits = mapStyleMemoryToTraits(styleJson);

  // Fetch existing state (or start from defaults)
  const existing = await getUserLearnedStyle(userId);
  const currentTraits = existing?.traits ?? DEFAULT_STYLE_TRAITS;
  const currentCount = existing?.observation_count ?? 0;

  // Merge: weighted running average
  const mergedTraits = mergeTraitObservation(currentTraits, incomingTraits, currentCount);
  const newCount = currentCount + 1;

  await supabaseService.from("user_learned_style").upsert(
    {
      user_id: userId,
      traits: mergedTraits,
      observation_count: newCount,
      last_updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

/**
 * Resets a user's learned style to defaults.
 * Useful for account settings "clear my style memory" action.
 */
export async function resetUserLearnedStyle(userId: string): Promise<void> {
  await supabaseService.from("user_learned_style").upsert(
    {
      user_id: userId,
      traits: DEFAULT_STYLE_TRAITS,
      observation_count: 0,
      last_updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

/**
 * Phase 3: Applies a compact behavioral trait delta to user_learned_style.
 *
 * Called fire-and-forget after each user selection event (/api/replies/select).
 * This is a WEAK signal path — each event nudges traits by a small amount.
 * Strong consistency over many selections gradually builds meaningful signal.
 *
 * Sparse users: if total_selections < 3, the signal is halved to prevent
 * overreacting to a user's first few choices before any pattern exists.
 *
 * @param userId         - authenticated user UUID
 * @param delta          - trait nudges from inferTraitDeltasFromSelection()
 * @param signalStrength - 0.0–1.0; 1.0 = save/favorite, 0.8 = copy, 0.5 = select
 * @param totalSelections - total selection count from user_preference_state (for sparsity guard)
 */
export async function updateLearnedStyleFromBehavior(
  userId: string,
  delta: TraitDelta,
  signalStrength: number,
  totalSelections: number,
): Promise<void> {
  if (Object.keys(delta).length === 0) {
    console.debug("[Phase3:trait-delta] empty delta — skipping write", { userId });
    return;
  }

  const existing = await getUserLearnedStyle(userId);
  const currentTraits = existing?.traits ?? DEFAULT_STYLE_TRAITS;
  const currentCount = existing?.observation_count ?? 0;

  // Sparsity guard: halve signal weight until the user has at least 3 confirmed selections
  const effectiveStrength = totalSelections < 3 ? signalStrength * 0.5 : signalStrength;

  const updatedTraits = applyTraitDelta(currentTraits, delta, effectiveStrength);

  await supabaseService.from("user_learned_style").upsert(
    {
      user_id: userId,
      traits: updatedTraits,
      // observation_count is reserved for style-summary observations (Phase 2);
      // behavioral events are tracked through user_preference_state.total_selections
      observation_count: currentCount,
      last_updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  console.debug("[Phase3:trait-delta] applied", {
    userId,
    signalStrength: effectiveStrength,
    traitsNudged: Object.keys(delta),
    totalSelections,
  });
}
