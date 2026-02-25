import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { upsertUserProfile } from "@/lib/supabase";
import { signInWithPassword } from "@/lib/supabase-auth";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
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
