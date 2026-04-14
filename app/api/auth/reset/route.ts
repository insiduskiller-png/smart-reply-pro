import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/password-reset-email";
import { resolveAppUrl } from "@/lib/env";
import { isValidEmail, normalizeEmail } from "@/lib/security";

function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  if (!local || !domain) return "invalid-email";
  return `${local.slice(0, 2)}***@${domain}`;
}

export async function POST(request: Request) {
  try {
    console.info("route-hit", {
      route: "/api/auth/reset",
      method: "POST",
    });

    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body.email);

    console.info("reset-request-start", {
      route: "/api/auth/reset",
      email: email ? maskEmail(email) : "missing",
    });

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const redirectUrl = new URL("/reset-password", resolveAppUrl(request)).toString();

    try {
      console.info("helper-used", {
        route: "/api/auth/reset",
        helper: "lib/password-reset-email.sendPasswordResetEmail",
      });
      await sendPasswordResetEmail(email, redirectUrl);
      return NextResponse.json({
        success: true,
        message: "If an account exists for that email, we sent a password reset link.",
      });
    } catch (error) {
      console.error("reset-password email error:", error);
      console.warn("fallback/default-path-hit", {
        route: "/api/auth/reset",
        reason: "branded-helper-error-no-default-email-fallback",
      });
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
