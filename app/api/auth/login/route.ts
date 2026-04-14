import { NextResponse } from "next/server";
import { supabase, supabaseService } from "@/lib/supabase";
import { bootstrapUserProfile } from "@/lib/profile-service";
import { extractRequestIp } from "@/lib/rate-limit";

const FAILED_LOGIN_THRESHOLD = 5;
const LOGIN_COOLDOWN_MS = 30_000;

function isCredentialFailure(error: { status?: number; message?: string } | null | undefined) {
  if (!error) return false;

  const status = Number(error.status ?? 0);
  const normalized = String(error.message ?? "").toLowerCase();

  if (status === 400 || status === 401) {
    return true;
  }

  return normalized.includes("invalid login credentials") || normalized.includes("invalid credentials");
}

function isEmailNotConfirmedFailure(error: { status?: number; message?: string } | null | undefined) {
  if (!error) return false;
  const normalized = String(error.message ?? "").toLowerCase();
  return (
    normalized.includes("email not confirmed") ||
    normalized.includes("email not verified") ||
    normalized.includes("confirm your email")
  );
}

/**
 * Count failed login attempts from this IP within the LOGIN_COOLDOWN_MS window.
 * Queries analytics_events so the count persists across serverless cold starts
 * and is shared across all concurrent function instances.
 */
async function countRecentFailedAttempts(ip: string): Promise<number> {
  const windowStart = new Date(Date.now() - LOGIN_COOLDOWN_MS).toISOString();
  try {
    const { count } = await supabaseService
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event", "login_failed_attempt")
      .eq("ip_address", ip)
      .gte("timestamp", windowStart);
    return count ?? 0;
  } catch {
    return 0; // fail open — never block logins if the DB check itself fails
  }
}

/** Persist a failed login attempt so it survives restarts and is visible to all instances. */
async function recordFailedAttempt(ip: string, userAgent: string) {
  try {
    await supabaseService.from("analytics_events").insert({
      event: "login_failed_attempt",
      user_id: null,
      metadata: {},
      timestamp: new Date().toISOString(),
      ip_address: ip,
      user_agent: userAgent,
    });
  } catch {
    // Silently swallow — don't break the login flow if recording fails
  }
}

export async function POST(req: Request) {
  try {
    console.info("login api: login started");
    const ip = extractRequestIp(req);
    const recentFailures = await countRecentFailedAttempts(ip);

    if (recentFailures >= FAILED_LOGIN_THRESHOLD) {
      const retryAfter = Math.ceil(LOGIN_COOLDOWN_MS / 1000);
      return NextResponse.json(
        {
          error: `Too many failed attempts. Try again in ${retryAfter} seconds.`,
          code: "LOGIN_COOLDOWN",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
          },
        },
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Supabase auth error:", error);

      if (isEmailNotConfirmedFailure(error)) {
        return NextResponse.json(
          { error: "Please verify your email before signing in." },
          { status: 403 },
        );
      }

      if (isCredentialFailure(error)) {
        await recordFailedAttempt(ip, req.headers.get("user-agent") ?? "");
        const newCount = recentFailures + 1;

        if (newCount >= FAILED_LOGIN_THRESHOLD) {
          const retryAfter = Math.ceil(LOGIN_COOLDOWN_MS / 1000);
          return NextResponse.json(
            {
              error: `Too many failed attempts. Try again in ${retryAfter} seconds.`,
              code: "LOGIN_COOLDOWN",
              retryAfter,
            },
            {
              status: 429,
              headers: {
                "Retry-After": String(retryAfter),
              },
            },
          );
        }

        return NextResponse.json(
          { error: "Incorrect email or password. Please try again." },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: "We couldn’t sign you in right now. Please try again in a moment." },
        { status: 500 }
      );
    }

    if (!data.user?.email_confirmed_at) {
      return NextResponse.json(
        { error: "Please verify your email before signing in." },
        { status: 403 },
      );
    }

    if (!data.session) {
      await recordFailedAttempt(ip, req.headers.get("user-agent") ?? "");
      return NextResponse.json(
        { error: "No session created" },
        { status: 400 }
      );
    }

    console.info("login api: supabase auth success", { userId: data.user?.id ?? null });
    console.info("login api: session received", { hasAccessToken: Boolean(data.session.access_token) });

    let bootstrapStatus: "ready" | "deferred" = "ready";
    let bootstrappedProfile = null;
    try {
      const bootstrap = await bootstrapUserProfile(data.user, { source: "auth-login" });
      bootstrappedProfile = bootstrap.profile;
      console.info("login api: profile bootstrap complete", {
        userId: data.user.id,
        created: bootstrap.created,
        repaired: bootstrap.repaired,
      });
    } catch (profileErr) {
      bootstrapStatus = "deferred";
      console.error("login api: profile bootstrap failed", {
        userId: data.user.id,
        message: profileErr instanceof Error ? profileErr.message : "Unknown bootstrap failure",
      });
    }

    const response = NextResponse.json({
      success: true,
      user: data.user,
      sessionToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      expiresIn: data.session.expires_in,
      profile: bootstrappedProfile,
      bootstrapStatus,
    });

    // Set session cookie for middleware
    response.cookies.set("srp_session", data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    console.info("login api: login finished", { success: true, userId: data.user?.id ?? null });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
