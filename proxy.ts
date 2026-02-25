import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/env";

const protectedRoutes = ["/dashboard"];

async function isValidSession(token: string) {
  try {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!protectedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const session = request.cookies.get("srp_session")?.value;
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const valid = await isValidSession(session);
  if (!valid) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("srp_session");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
