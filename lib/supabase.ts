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

export async function ensureUserProfile(user: { id: string; email: string }) {
  try {
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
    const username = (user.email ?? "").split("@")[0];
    
    const { data: createdProfile, error: upsertError } = await supabaseService
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
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
          email: user.email,
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
          email: user.email,
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
    const username = (user.email ?? "").split("@")[0];
    return {
      id: user.id,
      email: user.email,
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
