import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/supabase-auth";
import { isValidEmail, normalizeEmail } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body.email);

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const requestOrigin = new URL(request.url).origin;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || requestOrigin;
    const redirectUrl = new URL("/reset-password", appUrl).toString();

    try {
      await sendPasswordResetEmail(email, redirectUrl);
      return NextResponse.json({
        success: true,
        message: "If an account exists for that email, we sent a password reset link.",
      });
    } catch (error) {
      console.error("reset-password email error:", error);
      return NextResponse.json({
        success: true,
        message: "If an account exists for that email, we sent a password reset link.",
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
