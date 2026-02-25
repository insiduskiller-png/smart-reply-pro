import { getSupabaseEnv } from "./env";

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

export async function upsertUserProfile(user: { id: string; email: string }) {
  const { supabaseUrl, supabaseServiceKey } = getSupabaseEnv();
  await fetch(`${supabaseUrl}/rest/v1/users`, {
    method: "POST",
    headers: { ...headers(supabaseServiceKey), Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ id: user.id, email: user.email, subscription_status: "free", daily_usage_count: 0, last_usage_reset: new Date().toISOString() }),
  });
}

export async function getUserProfile(userId: string) {
  const { supabaseUrl, supabaseServiceKey } = getSupabaseEnv();
  const response = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=*`, {
    headers: headers(supabaseServiceKey),
    cache: "no-store",
  });
  const rows = await response.json();
  return rows?.[0] ?? null;
}

export async function patchUserProfile(userId: string, values: Record<string, unknown>) {
  const { supabaseUrl, supabaseServiceKey } = getSupabaseEnv();
  await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}`, {
    method: "PATCH",
    headers: headers(supabaseServiceKey),
    body: JSON.stringify(values),
  });
}

export async function insertGeneration(values: Record<string, unknown>) {
  const { supabaseUrl, supabaseServiceKey } = getSupabaseEnv();
  await fetch(`${supabaseUrl}/rest/v1/generations`, {
    method: "POST",
    headers: headers(supabaseServiceKey),
    body: JSON.stringify(values),
  });
}
