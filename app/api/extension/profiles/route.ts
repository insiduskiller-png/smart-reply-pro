import { NextResponse } from "next/server";
import { getSupabaseUser, getReplyProfilesByUser } from "@/lib/supabase";
import { bootstrapUserProfile } from "@/lib/profile-service";
import { hasProAccess } from "@/lib/billing";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function requireBearer(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7);
  try {
    return await getSupabaseUser(token);
  } catch {
    return null;
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(request: Request) {
  const user = await requireBearer(request);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: CORS },
    );
  }

  try {
    const { profile } = await bootstrapUserProfile(user, {
      source: "extension-profiles",
    });

    const isPro = hasProAccess(profile.subscription_status);

    if (!isPro) {
      return NextResponse.json(
        {
          error: "Pro subscription required",
          upgradeUrl: "https://www.smartreplypro.ai/pricing",
        },
        { status: 403, headers: CORS },
      );
    }

    const profiles = await getReplyProfilesByUser(user.id);
    return NextResponse.json({ profiles }, { headers: CORS });
  } catch (err) {
    console.error("[extension][profiles] error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500, headers: CORS },
    );
  }
}
