import { cookies } from "next/headers";
import { getSupabaseUser } from "./supabase";

const COOKIE = "srp_session";
const REFRESH_COOKIE = "srp_refresh";

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function setRefreshCookie(refreshToken: string) {
  const store = await cookies();
  store.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Supabase refresh tokens are valid for up to 60 days; store for 30.
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE);
  store.delete(REFRESH_COOKIE);
}

/**
 * Returns the authenticated user from the session cookie.
 * If the access token is expired, automatically attempts a silent refresh
 * using the stored refresh token and updates both cookies in-place.
 * This prevents logged-in users from being redirected to /login just
 * because Supabase rotated their access token between page navigations.
 */
export async function requireUser() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  try {
    return await getSupabaseUser(token);
  } catch {
    // Access token is expired or invalid — try a silent refresh.
    const refreshToken = store.get(REFRESH_COOKIE)?.value;
    if (!refreshToken) return null;

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) return null;

      const refreshResponse = await fetch(
        `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        },
      );

      if (!refreshResponse.ok) return null;

      const refreshData = await refreshResponse.json().catch(() => null) as {
        access_token?: string;
        refresh_token?: string;
      } | null;

      if (!refreshData?.access_token || !refreshData?.refresh_token) return null;

      // Persist the new tokens so subsequent navigations use the fresh access token.
      await setSessionCookie(refreshData.access_token);
      await setRefreshCookie(refreshData.refresh_token);

      return await getSupabaseUser(refreshData.access_token);
    } catch {
      return null;
    }
  }
}
