import { getSupabaseEnv } from "./env";
import { sendPasswordResetEmail as sendBrandedPasswordResetEmail } from "./password-reset-email";

// Supabase GoTrue v2 returns errors as { msg, error_code, code }.
// Older OAuth2 endpoints may use { error_description, message }.
type AuthError = {
  msg?: string;
  message?: string;
  error?: string;
  error_description?: string;
  error_code?: string;
  code?: number;
};

function authHeaders(bearer?: string) {
  const { supabaseAnonKey } = getSupabaseEnv();
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${bearer ?? supabaseAnonKey}`,
    "Content-Type": "application/json",
  };
}

async function parseError(response: Response, operation?: string): Promise<string> {
  let rawText = "";
  let payload: AuthError = {};
  try {
    rawText = await response.text();
    payload = JSON.parse(rawText) as AuthError;
  } catch {
    // non-JSON body
  }
  const human =
    payload.error_description ||
    payload.msg ||
    payload.message ||
    payload.error ||
    (payload.error_code ? `Supabase error: ${payload.error_code}` : "") ||
    rawText ||
    "Supabase auth request failed";
  const resolved = human || "Supabase auth request failed";
  console.error("supabase-auth-error", {
    operation: operation ?? "unknown",
    status: response.status,
    errorMessage: resolved,
    errorCode: payload.error_code,
  });
  return resolved;
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
    throw new Error(await parseError(response, "signInWithPassword"));
  }

  return response.json();
}

export async function sendPasswordResetEmail(email: string, redirectTo: string) {
  console.warn("fallback/default-path-hit", {
    helper: "lib/supabase-auth.sendPasswordResetEmail",
    behavior: "legacy-helper-invoked-rerouting-to-branded-email-helper",
  });
  console.info("helper-used", {
    helper: "lib/supabase-auth.sendPasswordResetEmail",
    reroutedTo: "lib/password-reset-email.sendPasswordResetEmail",
  });
  return sendBrandedPasswordResetEmail(email, redirectTo);
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
    throw new Error(await parseError(response, "updateUserPassword"));
  }

  return response.json();
}
