import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import { updateBootstrappedUserProfile } from "@/lib/profile-service";
import { trackEvent } from "@/lib/analytics";
import {
  RegistrationVerificationEmailError,
  sendRegistrationVerificationEmail,
} from "@/lib/registration-verification-email";
import { enforceRateLimit, extractRequestIp } from "@/lib/rate-limit";

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeUsername(value: unknown) {
  return String(value ?? "").trim().slice(0, 80);
}

function resolveAppUrl(req: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // fallback to request origin
    }
  }

  try {
    return new URL(req.url).origin;
  } catch {
    return "https://smartreplypro.ai";
  }
}

export async function POST(req: Request) {
  try {
    // IP-based rate limit: max 5 registration attempts per IP per hour.
    // This prevents account-creation spam and resource exhaustion.
    const ip = extractRequestIp(req);
    const regRate = enforceRateLimit(`register:${ip}`, 5, 3_600_000);
    if (!regRate.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(regRate.retryAfter ?? 3600) },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(body.email);
    const password = String(body.password ?? "");
    const username = normalizeUsername(body.username);
    const appUrl = resolveAppUrl(req);
    const verificationRedirectTo = `${appUrl}/auth/verified`;

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: "Email, password, and username required" },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const { data: signupLinkData, error } = await supabaseService.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        redirectTo: verificationRedirectTo,
        data: {
          username,
        },
      },
    });

    if (error) {
      console.error("Supabase signup error:", error);
      return NextResponse.json(
        { error: error.message || "Signup failed" },
        { status: 400 }
      );
    }

    const signupUser = signupLinkData?.user;
    const verificationUrl = signupLinkData?.properties?.action_link;

    if (!signupUser || !verificationUrl) {
      return NextResponse.json(
        { error: "Could not prepare verification email" },
        { status: 500 }
      );
    }

    console.info("register api: verification email send attempt", {
      userId: signupUser.id,
    });

    try {
      const emailResult = await sendRegistrationVerificationEmail({
        toEmail: email,
        username,
        verificationUrl,
      });

      console.info("register api: verification email send success", {
        userId: signupUser.id,
        toAddress: emailResult.toAddress,
        fromAddress: emailResult.fromAddress,
        resendId: emailResult.resendId,
      });
    } catch (sendErr) {
      console.error("register api: verification email send failed", {
        userId: signupUser.id,
        message: sendErr instanceof Error ? sendErr.message : "Unknown email send failure",
        httpStatus: sendErr instanceof RegistrationVerificationEmailError ? sendErr.httpStatus : null,
        providerResponse: sendErr instanceof RegistrationVerificationEmailError ? sendErr.resendPayload : null,
      });

      await supabaseService.auth.admin.deleteUser(signupUser.id).catch((deleteErr) => {
        console.error("register api: rollback delete user failed", {
          userId: signupUser.id,
          message: deleteErr instanceof Error ? deleteErr.message : "Unknown rollback error",
        });
      });

      return NextResponse.json(
        { error: "We couldn’t send your verification email. Please try again." },
        { status: 502 },
      );
    }

    // Ensure profile exists for user
    try {
      await updateBootstrappedUserProfile(
        {
          id: signupUser.id,
          email,
          user_metadata: { username },
        },
        { username },
        { source: "auth-register" },
      );
      console.info("register api: profile bootstrap and username pinned", {
        userId: signupUser.id,
        username,
      });
    } catch (profileErr) {
      console.error("register api: profile bootstrap failed", {
        userId: signupUser.id,
        message: profileErr instanceof Error ? profileErr.message : "Unknown bootstrap failure",
      });
      // Do not fail signup; login/session bootstrap can recover later.
    }

    // Track account creation
    try {
      await trackEvent("account_created", { email }, signupUser.id);
    } catch (analyticsErr) {
      console.debug("Failed to track account creation:", analyticsErr);
      // Don't fail signup if analytics fails
    }

    return NextResponse.json({
      success: true,
      user: signupUser,
      message: "Account created. Check your inbox and confirm your email before signing in.",
    });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
