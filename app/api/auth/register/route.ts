import { NextResponse } from "next/server";
import { supabase, supabaseService, ensureUserProfile } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { email, password, username } = await req.json();

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
      await ensureUserProfile(data.user);
    } catch (profileErr) {
      console.error("Profile creation error:", profileErr);
      // Don't fail signup if profile creation fails
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
