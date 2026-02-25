import { NextResponse } from "next/server";
import { updateUserPassword } from "@/lib/supabase-auth";
import { sanitizeText } from "@/lib/security";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const accessToken = sanitizeText(body.accessToken, 2000);
  const password = sanitizeText(body.password, 256);

  if (!accessToken || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Access token and password (min 8 chars) are required" },
      { status: 400 },
    );
  }

  try {
    await updateUserPassword(accessToken, password);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update password" },
      { status: 400 },
    );
  }
}
