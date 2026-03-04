import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { getSupabaseEnv } from "@/lib/env";
import { sanitizeText } from "@/lib/security";

function authHeaders(bearer: string) {
  const { supabaseAnonKey } = getSupabaseEnv();
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${bearer}`,
    "Content-Type": "application/json",
  };
}

async function parseError(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as { message?: string; error_description?: string };
  return payload.error_description || payload.message || "Supabase auth request failed";
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const email = sanitizeText(body.email, 320);

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const store = await cookies();
  const accessToken = store.get("srp_session")?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { supabaseUrl } = getSupabaseEnv();
    const origin = new URL(request.url).origin;
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "PUT",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ email, email_redirect_to: `${origin}/account` }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: await parseError(response) }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update email" },
      { status: 400 },
    );
  }
}
