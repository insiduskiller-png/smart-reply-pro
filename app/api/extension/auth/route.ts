import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { bootstrapUserProfile } from "@/lib/profile-service";
import { hasProAccess } from "@/lib/billing";
import { sanitizeText } from "@/lib/security";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = sanitizeText(body.email, 320);
    const password = sanitizeText(body.password, 1024);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400, headers: CORS },
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return NextResponse.json(
        { error: error?.message || "Invalid credentials" },
        { status: 401, headers: CORS },
      );
    }

    const { profile } = await bootstrapUserProfile(data.user, {
      source: "extension-auth",
    });

    const isPro = hasProAccess(profile.subscription_status);

    return NextResponse.json(
      {
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          username: profile.username ?? null,
        },
        isPro,
        subscriptionStatus: profile.subscription_status ?? "free",
      },
      { headers: CORS },
    );
  } catch (err) {
    console.error("[extension][auth] error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500, headers: CORS },
    );
  }
}
