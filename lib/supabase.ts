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
