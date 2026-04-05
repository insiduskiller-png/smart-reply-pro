import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, getTierRateLimit } from "@/lib/rate-limit";
import { suggestTone } from "@/lib/openai";
import { requireUser } from "@/lib/auth";
import { hasProAccess } from "@/lib/billing";
import { bootstrapUserProfile } from "@/lib/profile-service";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { profile } = await bootstrapUserProfile(user, { source: "api-suggest-tone" });
    const isPro = hasProAccess(profile?.subscription_status);

    // APPLY TIER-BASED RATE LIMITING (free: 10/min, pro: 30/min)
    const { limit: rateLimit, windowMs } = getTierRateLimit(isPro);
    const rate = enforceRateLimit(user.id, rateLimit, windowMs);

    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: rate.retryAfter,
          limit: rate.limit,
          remaining: 0,
          resetAt: rate.reset,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rate.retryAfter || 60),
            "RateLimit-Limit": String(rate.limit),
            "RateLimit-Remaining": "0",
            "RateLimit-Reset": String(rate.reset),
          },
        }
      );
    }

    const { input } = await req.json();

    if (!input?.trim()) {
      return NextResponse.json({ error: "Input required" }, { status: 400 });
    }

    const tone = await suggestTone(input, isPro);

    return NextResponse.json({ tone });
  } catch (error) {
    console.error("Tone suggestion error:", error);
    return NextResponse.json(
      { error: "Failed to suggest tone" },
      { status: 500 }
    );
  }
}
