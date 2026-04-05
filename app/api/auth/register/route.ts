import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { bootstrapUserProfile } from "@/lib/profile-service";
import { trackEvent } from "@/lib/analytics";

export async function POST(req: Request) {
  try {
    const { email, password, username } = await req.json();
    const origin = new URL(req.url).origin;

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

    // Sign up user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/`,
        data: {
          username: username,
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

    if (!data.user) {
      return NextResponse.json(
        { error: "User creation failed" },
        { status: 400 }
      );
    }

    // Ensure profile exists for user
    try {
      const bootstrap = await bootstrapUserProfile(data.user, { source: "auth-register" });
      console.info("register api: profile bootstrap complete", {
        userId: data.user.id,
        created: bootstrap.created,
        repaired: bootstrap.repaired,
      });
    } catch (profileErr) {
      console.error("register api: profile bootstrap failed", {
        userId: data.user.id,
        message: profileErr instanceof Error ? profileErr.message : "Unknown bootstrap failure",
      });
      // Do not fail signup; login/session bootstrap can recover later.
    }

    // Track account creation
    try {
      await trackEvent("account_created", { email }, data.user.id);
    } catch (analyticsErr) {
      console.debug("Failed to track account creation:", analyticsErr);
      // Don't fail signup if analytics fails
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      message: "Signup successful. Please log in with your credentials.",
    });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
