import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/supabase-auth";
import { isValidEmail, normalizeEmail } from "@/lib/security";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/`;

  try {
    await sendPasswordResetEmail(email, redirectTo);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send reset email" },
      { status: 500 },
    );
  }
}
