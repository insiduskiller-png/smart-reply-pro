import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getProfileMessagesByProfile, getReplyProfileById } from "@/lib/supabase";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const profileId = url.searchParams.get("profileId") ?? "";

    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const profile = await getReplyProfileById(profileId, user.id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const messages = await getProfileMessagesByProfile({
      profileId,
      userId: user.id,
      limit: 200,
    });

    return NextResponse.json({
      profile,
      messages: messages.slice().reverse(),
    });
  } catch (error) {
    console.error("Fetch profile messages error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
