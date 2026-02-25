import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { upsertUserProfile } from "@/lib/supabase";
import { signInWithPassword } from "@/lib/supabase-auth";
import { isValidEmail, normalizeEmail, sanitizeText } from "@/lib/security";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const password = sanitizeText(body.password, 256);

  if (!email || !password || !isValidEmail(email)) {
    return NextResponse.json({ error: "Valid credentials are required" }, { status: 400 });
  }

  try {
    const auth = await signInWithPassword(email, password);
    await setSessionCookie(auth.access_token);
    if (auth.user?.id && auth.user?.email) {
      await upsertUserProfile({ id: auth.user.id, email: auth.user.email });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid email or password",
      },
      { status: 401 },
    );
  }
}
