import { NextResponse } from "next/server";
import { bootstrapUserProfile, updateBootstrappedUserProfile } from "@/lib/profile-service";
import { requireUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/security";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const bootstrap = await bootstrapUserProfile(user, { source: "api-user-profile:get" });
      return NextResponse.json({ profile: bootstrap.profile });
    } catch (error) {
      console.error("Profile fetch bootstrap error:", error);
      return NextResponse.json({ error: "Unable to load profile" }, { status: 503 });
    }
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
      updates.username_color = sanitizeText(body.username_color, 80) || "#ffffff";
    }

    if (
      Object.prototype.hasOwnProperty.call(body, "username_color") ||
      Object.prototype.hasOwnProperty.call(body, "username_style")
    ) {
      updates.username_style = "gradient";
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No profile updates provided" }, { status: 400 });
    }

    const profile = await updateBootstrappedUserProfile(user, updates, { source: "api-user-profile:post" });
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
