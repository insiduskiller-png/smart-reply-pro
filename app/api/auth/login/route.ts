import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { bootstrapUserProfile } from "@/lib/profile-service";

export async function POST(req: Request) {
  try {
    console.info("login api: login started");
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
      return NextResponse.json(
        { error: error.message || "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!data.session) {
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
