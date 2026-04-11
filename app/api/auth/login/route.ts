import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { bootstrapUserProfile } from "@/lib/profile-service";

const FAILED_LOGIN_THRESHOLD = 5;
const LOGIN_COOLDOWN_MS = 30_000;

type LoginAttemptState = {
  failedCount: number;
  cooldownUntil: number;
};

const loginAttemptState = new Map<string, LoginAttemptState>();

function getClientFingerprint(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0]?.trim() || "unknown-ip";
  const userAgent = req.headers.get("user-agent") || "unknown-ua";
  return `${ip}:${userAgent}`;
}

function getRetryAfterSeconds(cooldownUntil: number) {
  return Math.max(1, Math.ceil((cooldownUntil - Date.now()) / 1000));
}

function isCredentialFailure(error: { status?: number; message?: string } | null | undefined) {
  if (!error) return false;

  const status = Number(error.status ?? 0);
  const normalized = String(error.message ?? "").toLowerCase();

  if (status === 400 || status === 401) {
    return true;
  }

  return normalized.includes("invalid login credentials") || normalized.includes("invalid credentials");
}

function clearLoginAttemptState(fingerprint: string) {
  loginAttemptState.delete(fingerprint);
}

function registerFailedAttempt(fingerprint: string) {
  const current = loginAttemptState.get(fingerprint) ?? {
    failedCount: 0,
    cooldownUntil: 0,
  };

  const now = Date.now();
  if (current.cooldownUntil && current.cooldownUntil <= now) {
    current.cooldownUntil = 0;
    current.failedCount = 0;
  }

  current.failedCount += 1;

  if (current.failedCount >= FAILED_LOGIN_THRESHOLD) {
    current.cooldownUntil = now + LOGIN_COOLDOWN_MS;
    current.failedCount = 0;
  }

  loginAttemptState.set(fingerprint, current);
  return current;
}

function getActiveCooldown(fingerprint: string) {
  const state = loginAttemptState.get(fingerprint);
  if (!state?.cooldownUntil) return null;

  if (state.cooldownUntil <= Date.now()) {
    loginAttemptState.delete(fingerprint);
    return null;
  }

  return state.cooldownUntil;
}

export async function POST(req: Request) {
  try {
    console.info("login api: login started");
    const fingerprint = getClientFingerprint(req);
    const activeCooldownUntil = getActiveCooldown(fingerprint);

    if (activeCooldownUntil) {
      const retryAfter = getRetryAfterSeconds(activeCooldownUntil);
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

      if (isCredentialFailure(error)) {
        const state = registerFailedAttempt(fingerprint);

        if (state.cooldownUntil > Date.now()) {
          const retryAfter = getRetryAfterSeconds(state.cooldownUntil);
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

    if (!data.session) {
      registerFailedAttempt(fingerprint);
      return NextResponse.json(
        { error: "No session created" },
        { status: 400 }
      );
    }

    clearLoginAttemptState(fingerprint);

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
