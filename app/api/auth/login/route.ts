import { NextResponse } from "next/server";
import { supabase, ensureUserProfile } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
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

    // Ensure profile exists for user (non-blocking, do not delay login redirect)
    void ensureUserProfile(data.user).catch((profileErr) => {
      console.error("Profile creation error:", profileErr);
    });

    const response = NextResponse.json({
      success: true,
      user: data.user,
      sessionToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      expiresIn: data.session.expires_in,
    });

    // Set session cookie for middleware
    response.cookies.set("srp_session", data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
