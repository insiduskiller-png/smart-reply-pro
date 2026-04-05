import { NextResponse } from "next/server";
import { enforceRateLimit, getTierRateLimit } from "@/lib/rate-limit";
import { generateReply } from "@/lib/openai";
import { requireUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/security";
import { hasProAccess } from "@/lib/billing";
import { bootstrapUserProfile } from "@/lib/profile-service";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { profile } = await bootstrapUserProfile(user, { source: "api-pro-optimized-reply" });
  const isPro = hasProAccess(profile?.subscription_status);

  if (!isPro) {
    return NextResponse.json({ error: "Pro optimized replies are available with Pro access." }, { status: 403 });
  }

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

  try {
    const body = await request.json().catch(() => ({}));
    const input = sanitizeText(body.input, 4000);
    const context = sanitizeText(body.context, 4000);
    const currentTone = sanitizeText(body.tone, 64) || "Neutral";

    if (!input) return NextResponse.json({ error: "Input required" }, { status: 400 });

    // Generate pro optimized reply using "Precision Authority" tone
    // This is the advanced version that demonstrates Pro value
    const proOptimizedReply = await generateReply({
      input,
      context,
      tone: "Precision Authority",
      variant: "Pro Optimized",
    });

    return NextResponse.json({
      proOptimizedReply,
    });
  } catch (error) {
    console.error("Pro optimized reply generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
