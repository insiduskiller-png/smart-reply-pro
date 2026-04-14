import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { getSupabaseEnv, resolveAppUrl } from "@/lib/env";
import { isValidEmail, normalizeEmail } from "@/lib/security";

// Supabase GoTrue v2 returns errors as { msg, error_code, code }.
// Older OAuth2 endpoints may use { error_description, message }.
// We check all known field names so the real error is never swallowed.
type GoTrueError = {
  msg?: string;
  message?: string;
  error?: string;
  error_description?: string;
  error_code?: string;
  code?: number;
};

function authHeaders(bearer: string) {
  const { supabaseAnonKey } = getSupabaseEnv();
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${bearer}`,
    "Content-Type": "application/json",
  };
}

async function parseError(response: Response): Promise<string> {
  let rawText = "";
  let payload: GoTrueError = {};
  try {
    rawText = await response.text();
    payload = JSON.parse(rawText) as GoTrueError;
  } catch {
    // non-JSON body — rawText still holds the raw response for logging
  }
  const human =
    payload.error_description ||
    payload.msg ||
    payload.message ||
    payload.error ||
    (payload.error_code ? `Supabase error: ${payload.error_code}` : "") ||
    rawText ||
    "Supabase auth request failed";
  return human || "Supabase auth request failed";
}

export async function POST(request: Request) {
  console.info("route-hit", { route: "/api/account/email", method: "POST" });

  const user = await requireUser();
  if (!user) {
    console.warn("email-change-auth-fail", { route: "/api/account/email", reason: "requireUser-returned-null" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  if (!user.email) {
    return NextResponse.json({ error: "Current user email not found" }, { status: 400 });
  }

  if (email === String(user.email).toLowerCase()) {
    return NextResponse.json({ error: "Enter a different email address" }, { status: 400 });
  }

  const store = await cookies();
  const accessToken = store.get("srp_session")?.value;
  if (!accessToken) {
    console.warn("email-change-auth-fail", { route: "/api/account/email", reason: "srp_session-cookie-missing" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { supabaseUrl } = getSupabaseEnv();
    const appOrigin = resolveAppUrl(request);
    const emailRedirectTo = new URL("/account?email_change=verified", appOrigin).toString();

    console.info("email-change-supabase-request", {
      route: "/api/account/email",
      supabaseUrl,
      appOrigin,
      emailRedirectTo,
      tokenPresent: Boolean(accessToken),
      tokenPrefix: accessToken.slice(0, 12) + "...",
    });

    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "PUT",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ email, email_redirect_to: emailRedirectTo }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorMessage = await parseError(response);
      console.error("email-change-supabase-error", {
        route: "/api/account/email",
        supabaseStatus: response.status,
        supabaseStatusText: response.statusText,
        errorMessage,
        emailRedirectTo,
        appOrigin,
        note: "If error is 'Redirect URL not allowed', add emailRedirectTo to Supabase Auth > URL Configuration > Additional Redirect URLs",
      });
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    console.info("email-change-supabase-success", { route: "/api/account/email", supabaseStatus: response.status });
    return NextResponse.json({
      success: true,
      verificationRequired: true,
      pendingEmail: email,
      message: "Check your inbox to verify this email change. Your current email stays active until verification is complete.",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unable to update email";
    console.error("email-change-exception", { route: "/api/account/email", error: msg });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
