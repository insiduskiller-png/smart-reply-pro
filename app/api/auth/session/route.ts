import { NextResponse } from "next/server";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth";
import { sanitizeText } from "@/lib/security";
import { getSupabaseUser } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const accessToken = sanitizeText(body.accessToken, 3000);

    if (!accessToken) {
      return NextResponse.json({ error: "Access token is required" }, { status: 400 });
    }

    try {
      await getSupabaseUser(accessToken);
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    await setSessionCookie(accessToken);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
