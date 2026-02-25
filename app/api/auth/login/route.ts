import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { supabasePasswordLogin, upsertUserProfile } from "@/lib/supabase";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  try {
    const auth = await supabasePasswordLogin(email, password);
    await setSessionCookie(auth.access_token);
    await upsertUserProfile({ id: auth.user.id, email: auth.user.email });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Invalid credentials";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
