import { NextResponse } from "next/server";
import { supabaseService, ensureUserProfile } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/security";

function withProfileCustomizationFallback<T extends Record<string, unknown> | null>(profile: T) {
  return {
    ...(profile ?? {}),
    username_color: (profile?.username_color as string | null | undefined) || "#ffffff",
    username_style: (profile?.username_style as string | null | undefined) || "solid",
  };
}

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

    return NextResponse.json({ profile: withProfileCustomizationFallback(data) });
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

    const updates: { username?: string | null; username_color?: string | null; username_style?: string | null } = {};

    if (Object.prototype.hasOwnProperty.call(body, "username")) {
      updates.username = sanitizeText(body.username, 80) || null;
    }

    if (Object.prototype.hasOwnProperty.call(body, "username_color")) {
      updates.username_color = sanitizeText(body.username_color, 80) || null;
    }

    if (Object.prototype.hasOwnProperty.call(body, "username_style")) {
      const sanitized = sanitizeText(body.username_style, 40)?.toLowerCase();
      updates.username_style = sanitized === "gradient" ? "gradient" : "solid";
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

    if (error?.code === "42703") {
      const fallbackUpdates = { ...updates };
      delete fallbackUpdates.username_color;
      delete fallbackUpdates.username_style;

      if (Object.keys(fallbackUpdates).length > 0) {
        const fallbackUpdate = await supabaseService
          .from("profiles")
          .update(fallbackUpdates)
          .eq("id", user.id)
          .select()
          .single();

        if (fallbackUpdate.error) {
          return NextResponse.json({ error: fallbackUpdate.error.message }, { status: 400 });
        }

        return NextResponse.json({ profile: withProfileCustomizationFallback(fallbackUpdate.data) });
      }

      const currentProfile = await supabaseService
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (currentProfile.error) {
        return NextResponse.json({ error: currentProfile.error.message }, { status: 400 });
      }

      return NextResponse.json({ profile: withProfileCustomizationFallback(currentProfile.data) });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ profile: withProfileCustomizationFallback(data) });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
