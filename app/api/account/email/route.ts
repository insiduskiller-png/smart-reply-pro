import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { resolveAppUrl } from "@/lib/env";
import { isValidEmail, normalizeEmail } from "@/lib/security";
import { sendEmailChangeConfirmation } from "@/lib/email-change-email";

export async function POST(request: Request) {
  console.info("route-hit", { route: "/api/account/email", method: "POST" });

  const user = await requireUser();
  if (!user) {
    console.warn("email-change-auth-fail", { route: "/api/account/email", reason: "requireUser-returned-null" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  if (!user.email) {
    return NextResponse.json({ error: "Current user email not found" }, { status: 400 });
  }

  if (email === String(user.email).toLowerCase()) {
    return NextResponse.json({ error: "Enter a different email address" }, { status: 400 });
  }

  try {
    const appOrigin = resolveAppUrl(request);
    const redirectTo = new URL("/account?email_change=verified", appOrigin).toString();

    console.info("email-change-request", {
      route: "/api/account/email",
      appOrigin,
      redirectTo,
    });

    // Uses admin.generateLink (no Supabase email) + sends branded Resend email.
    await sendEmailChangeConfirmation(String(user.email), email, redirectTo);

    return NextResponse.json({
      success: true,
      verificationRequired: true,
      pendingEmail: email,
      message: "Check your inbox to verify this email change. Your current email stays active until verification is complete.",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unable to update email";
    console.error("email-change-exception", { route: "/api/account/email", error: msg });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
