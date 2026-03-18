import { NextResponse } from "next/server";
import { supabaseService, ensureUserProfile } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/security";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure profile exists
    try {
      await ensureUserProfile(user);
    } catch (error) {
      console.error("Profile creation error:", error);
    }

    const { data, error } = await supabaseService
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ profile: data });
  } catch (err) {
    console.error("Profile fetch error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    const updates: { username?: string | null; username_color?: string | null } = {};

    if (Object.prototype.hasOwnProperty.call(body, "username")) {
      updates.username = sanitizeText(body.username, 80) || null;
    }

    if (Object.prototype.hasOwnProperty.call(body, "username_color")) {
      updates.username_color = sanitizeText(body.username_color, 80) || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No profile updates provided" }, { status: 400 });
    }

    const { data, error } = await supabaseService
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ profile: data });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
