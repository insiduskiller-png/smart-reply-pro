import { getSupabaseEnv } from "./env";

type AuthError = { message?: string; error_description?: string };

function authHeaders(bearer?: string) {
  const { supabaseAnonKey } = getSupabaseEnv();
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${bearer ?? supabaseAnonKey}`,
    "Content-Type": "application/json",
  };
}

async function parseError(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as AuthError;
  return payload.error_description || payload.message || "Supabase auth request failed";
}

export async function signInWithPassword(email: string, password: string) {
  const { supabaseUrl } = getSupabaseEnv();
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function sendPasswordResetEmail(email: string, redirectTo: string) {
  const { supabaseUrl } = getSupabaseEnv();
  const response = await fetch(`${supabaseUrl}/auth/v1/recover`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, redirect_to: redirectTo }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function updateUserPassword(accessToken: string, password: string) {
  const { supabaseUrl } = getSupabaseEnv();
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "PUT",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ password }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}
