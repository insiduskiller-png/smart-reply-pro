import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/supabase-auth";
import { isValidEmail, normalizeEmail } from "@/lib/security";
import { getStripeEnv } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body.email);

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const { appUrl } = getStripeEnv();
    const redirectUrl = `${appUrl}/reset-password`;

    try {
      await sendPasswordResetEmail(email, redirectUrl);
      return NextResponse.json({ success: true, message: "Password reset email sent" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to send reset email";
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 },
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
