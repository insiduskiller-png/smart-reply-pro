import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/password-reset-email";
import { resolveAppUrl } from "@/lib/env";

function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  if (!local || !domain) return "invalid-email";
  return `${local.slice(0, 2)}***@${domain}`;
}

export async function POST(request: Request) {
  try {
    console.info("route-hit", {
      route: "/api/account/password-reset",
      method: "POST",
    });

    const user = await requireUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.info("reset-request-start", {
      route: "/api/account/password-reset",
      email: maskEmail(user.email),
    });

    const redirectUrl = new URL("/reset-password", resolveAppUrl(request)).toString();
    
    try {
      console.info("helper-used", {
        route: "/api/account/password-reset",
        helper: "lib/password-reset-email.sendPasswordResetEmail",
      });
      await sendPasswordResetEmail(user.email, redirectUrl);
      return NextResponse.json({ success: true, message: "Password reset email sent." });
    } catch (error) {
      console.warn("fallback/default-path-hit", {
        route: "/api/account/password-reset",
        reason: "branded-helper-error-no-default-email-fallback",
      });
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
