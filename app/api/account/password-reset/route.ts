import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/supabase-auth";
import { getStripeEnv } from "@/lib/env";

export async function POST() {
  try {
    const user = await requireUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { appUrl } = getStripeEnv();
    const redirectUrl = `${appUrl}/reset-password`;
    
    try {
      await sendPasswordResetEmail(user.email, redirectUrl);
      return NextResponse.json({ success: true, message: "Password reset email sent" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to send reset email";
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 },
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
