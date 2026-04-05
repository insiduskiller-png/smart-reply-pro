import { NextResponse } from "next/server";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth";
import { sanitizeText } from "@/lib/security";
import { getSupabaseUser } from "@/lib/supabase";
import { bootstrapUserProfile } from "@/lib/profile-service";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const accessToken = sanitizeText(body.accessToken, 3000);

    if (!accessToken) {
      return NextResponse.json({ error: "Access token is required" }, { status: 400 });
    }

    let user;
    try {
      user = await getSupabaseUser(accessToken);
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    await setSessionCookie(accessToken);

    try {
      const bootstrap = await bootstrapUserProfile(user, { source: "auth-session" });
      return NextResponse.json({ success: true, user, profile: bootstrap.profile });
    } catch (error) {
      console.error("auth session bootstrap failed", {
        userId: user.id,
        message: error instanceof Error ? error.message : "Unknown bootstrap failure",
      });
      return NextResponse.json({ success: true, user, profile: null, bootstrapDeferred: true });
    }
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
