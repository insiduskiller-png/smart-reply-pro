import { NextResponse } from "next/server";
import { updateUserPassword } from "@/lib/supabase-auth";
import { sanitizeText } from "@/lib/security";

export async function POST(request: Request) {
  console.info("route-hit", { route: "/api/auth/update-password", method: "POST" });
  try {
    const body = await request.json().catch(() => ({}));
    const accessToken = sanitizeText(body.accessToken, 2000);
    const password = sanitizeText(body.password, 256);

    if (!accessToken || !password || password.length < 8) {
      console.warn("update-password-bad-input", {
        route: "/api/auth/update-password",
        hasToken: Boolean(accessToken),
        hasPassword: Boolean(password),
        passwordLength: password?.length ?? 0,
      });
      return NextResponse.json(
        { error: "Access token and password (min 8 chars) are required" },
        { status: 400 },
      );
    }

    console.info("update-password-supabase-request", {
      route: "/api/auth/update-password",
      tokenPresent: Boolean(accessToken),
      tokenPrefix: accessToken.slice(0, 12) + "...",
    });

    try {
      await updateUserPassword(accessToken, password);
      console.info("update-password-success", { route: "/api/auth/update-password" });
      return NextResponse.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to update password";
      console.error("update-password-supabase-error", {
        route: "/api/auth/update-password",
        errorMessage,
        note: "Real Supabase error is logged above by supabase-auth.ts::parseError with operation=updateUserPassword",
      });
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 },
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Server error";
    console.error("update-password-exception", { route: "/api/auth/update-password", error: errorMessage });
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
