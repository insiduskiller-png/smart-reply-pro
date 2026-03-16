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

export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabaseService
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    return data ?? null;
  } catch (error) {
    console.error("getUserProfile failed:", error);
    return null;
  }
}

export async function ensureUserProfile(user: { id: string; email?: string | null }) {
  try {
    // Safely handle email
    const email = user.email ?? "noemail@user.invalid";
    const username = email.split("@")[0];

    // First attempt: try to query existing profile
    const { data: existingProfile, error: queryError } = await supabaseService
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // If profile exists, return it
    if (existingProfile && !queryError) {
      return existingProfile;
    }

    // Profile doesn't exist, create it with upsert
    
    const { data: createdProfile, error: upsertError } = await supabaseService
      .from("profiles")
      .upsert({
        id: user.id,
        email: email,
        username: username,
        subscription_status: "free",
        created_at: new Date().toISOString(),
      }, {
        onConflict: "id",
      })
      .select()
      .single();

    if (upsertError) {
      console.error("Error creating profile on first attempt:", upsertError);
      
      // Retry once
      const { data: retryProfile, error: retryError } = await supabaseService
        .from("profiles")
        .upsert({
          id: user.id,
          email: email,
          username: username,
          subscription_status: "free",
          created_at: new Date().toISOString(),
        }, {
          onConflict: "id",
        })
        .select()
        .single();

      if (retryError) {
        console.error("Error creating profile on retry:", retryError);
        // Return a safe default profile object so page doesn't crash
        return {
          id: user.id,
          email: email,
          username: username,
          subscription_status: "free",
          created_at: new Date().toISOString(),
        };
      }

      return retryProfile;
    }

    return createdProfile;
  } catch (error) {
    console.error("ensureUserProfile failed:", error);
    
    // Never throw - always return a safe default profile
    const email = user.email ?? "noemail@user.invalid";
    const username = email.split("@")[0];
    return {
      id: user.id,
      email: email,
      username: username,
      subscription_status: "free",
      created_at: new Date().toISOString(),
    };
  }
}

export async function upsertUserProfile(
  userId: string,
  email: string,
  username: string,
) {
  const { error } = await supabaseService
    .from("profiles")
    .upsert({
      id: userId,
      email,
      username,
      subscription_status: "free",
    }, {
      onConflict: "id",
    });

  if (error) {
    console.error("Error upserting profile:", error);
  }
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
  profileCategory?: string;
  contextNotes?: string;
  styleSummary?: string;
  tonePattern?: string;
  sentenceLength?: string;
  directnessLevel?: string;
  emojiUsage?: string;
  formalityLevel?: string;
  conflictStyle?: string;
}) {
  const now = new Date().toISOString();
  const primaryPayload = {
    user_id: params.userId,
    profile_name: params.profileName,
    contact_name: params.profileName,
    profile_category: params.profileCategory ?? null,
    relationship_type: params.profileCategory ?? null,
    context_notes: params.contextNotes ?? null,
    style_summary: params.styleSummary ?? null,
    tone_pattern: params.tonePattern ?? null,
    sentence_length: params.sentenceLength ?? null,
    directness_level: params.directnessLevel ?? null,
    emoji_usage: params.emojiUsage ?? null,
    formality_level: params.formalityLevel ?? null,
    conflict_style: params.conflictStyle ?? null,
    last_activity_at: now,
    updated_at: now,
  };

  console.info("[createReplyProfile] Attempting primary insert", {
    user_id: params.userId,
    profile_name: params.profileName,
  });

  const primary = await supabaseService
    .from("reply_profiles")
    .insert(primaryPayload)
    .select("*")
    .single();

  if (!primary.error && primary.data) {
    console.info("[createReplyProfile] Primary insert success", { id: primary.data.id });
    return primary.data;
  }

  console.error("[createReplyProfile] Primary insert failed", primary.error);

  // Fallback for partially-migrated schemas (legacy columns only)
  const fallbackPayload = {
    user_id: params.userId,
    contact_name: params.profileName,
    relationship_type: params.profileCategory ?? null,
    context_notes: params.contextNotes ?? null,
    style_summary: params.styleSummary ?? null,
    created_at: now,
  };

  console.info("[createReplyProfile] Attempting fallback insert");

  const fallback = await supabaseService
    .from("reply_profiles")
    .insert(fallbackPayload)
    .select("*")
    .single();

  if (fallback.error) {
    console.error("[createReplyProfile] Fallback insert failed", fallback.error);
    return null;
  }

  console.info("[createReplyProfile] Fallback insert success", { id: fallback.data?.id });
  return fallback.data;
}

export async function getReplyProfilesByUser(userId: string) {
  const { data, error } = await supabaseService
    .from("reply_profiles")
    .select("id, profile_name, profile_category, contact_name, relationship_type, context_notes, style_summary, tone_pattern, sentence_length, directness_level, emoji_usage, formality_level, conflict_style, created_at, updated_at, last_activity_at")
    .eq("user_id", userId)
    .order("last_activity_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching reply profiles:", error);
    return [];
  }

  return data ?? [];
}

export async function getReplyProfileById(profileId: string, userId: string) {
  const { data, error } = await supabaseService
    .from("reply_profiles")
    .select("id, user_id, profile_name, profile_category, contact_name, relationship_type, context_notes, style_summary, tone_pattern, sentence_length, directness_level, emoji_usage, formality_level, conflict_style, created_at, updated_at, last_activity_at")
    .eq("id", profileId)
    .eq("user_id", userId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function updateReplyProfileDetails(params: {
  profileId: string;
  userId: string;
  profileName: string;
  profileCategory?: string | null;
  contextNotes?: string | null;
}) {
  const now = new Date().toISOString();

  const { data, error } = await supabaseService
    .from("reply_profiles")
    .update({
      profile_name: params.profileName,
      contact_name: params.profileName,
      profile_category: params.profileCategory ?? null,
      relationship_type: params.profileCategory ?? null,
      context_notes: params.contextNotes ?? null,
      updated_at: now,
    })
    .eq("id", params.profileId)
    .eq("user_id", params.userId)
    .select("id, user_id, profile_name, profile_category, contact_name, relationship_type, context_notes, style_summary, tone_pattern, sentence_length, directness_level, emoji_usage, formality_level, conflict_style, created_at, updated_at, last_activity_at")
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
  styleSummary: string;
}) {
  const { error } = await supabaseService
    .from("reply_profiles")
    .update({
      style_summary: params.styleSummary,
      updated_at: new Date().toISOString(),
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
  styleSummary?: string;
  tonePattern?: string;
  sentenceLength?: string;
  directnessLevel?: string;
  emojiUsage?: string;
  formalityLevel?: string;
  conflictStyle?: string;
}) {
  const { data, error } = await supabaseService
    .from("reply_profiles")
    .update({
      style_summary: params.styleSummary ?? null,
      tone_pattern: params.tonePattern ?? null,
      sentence_length: params.sentenceLength ?? null,
      directness_level: params.directnessLevel ?? null,
      emoji_usage: params.emojiUsage ?? null,
      formality_level: params.formalityLevel ?? null,
      conflict_style: params.conflictStyle ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.profileId)
    .eq("user_id", params.userId)
    .select("id, style_summary, tone_pattern, sentence_length, directness_level, emoji_usage, formality_level, conflict_style")
    .single();

  if (error) {
    console.error("Error updating reply profile style memory:", error);
    return null;
  }

  return data;
}

export async function touchReplyProfileActivity(profileId: string, userId: string) {
  const now = new Date().toISOString();
  const { error } = await supabaseService
    .from("reply_profiles")
    .update({
      last_activity_at: now,
      updated_at: now,
    })
    .eq("id", profileId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error touching reply profile activity:", error);
  }
}

export async function insertProfileMessage(params: {
  profileId: string;
  userId: string;
  role: "incoming" | "user_reply" | "assistant_suggestion" | "history_import";
  content: string;
}) {
  const { data, error } = await supabaseService
    .from("profile_messages")
    .insert({
      profile_id: params.profileId,
      user_id: params.userId,
      role: params.role,
      content: params.content,
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
