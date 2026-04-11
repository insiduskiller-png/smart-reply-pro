import { NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/env";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { refreshToken } = body as { refreshToken?: string };

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token required" },
        { status: 400, headers: CORS },
      );
    }

    const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

    const response = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: {
          apikey: supabaseAnonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Token refresh failed. Please sign in again." },
        { status: 401, headers: CORS },
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
    };

    return NextResponse.json(
      {
        token: data.access_token,
        refreshToken: data.refresh_token,
      },
      { headers: CORS },
    );
  } catch (err) {
    console.error("[extension][refresh] error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500, headers: CORS },
    );
  }
}
