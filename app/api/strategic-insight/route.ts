import { NextResponse } from "next/server";
import { enforceRateLimit, getTierRateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/security";
import { generateStrategicInsight } from "@/lib/openai";
import { bootstrapUserProfile } from "@/lib/profile-service";

function maxTwoSentences(value: string) {
  const cleaned = sanitizeText(value, 280);
  const parts = cleaned.match(/[^.!?]+[.!?]?/g)?.map((part) => part.trim()).filter(Boolean) ?? [];
  return parts.slice(0, 2).join(" ");
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { profile } = await bootstrapUserProfile(user, { source: "api-strategic-insight" });
  const isPro = profile?.subscription_status === "pro";

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
    const reply = sanitizeText(body.reply, 4000);

    if (!reply) {
      return NextResponse.json({ error: "Reply is required" }, { status: 400 });
    }

    const insight = await generateStrategicInsight(reply);
    return NextResponse.json({ insight: maxTwoSentences(insight || "") });
  } catch (error) {
    console.error("Strategic insight error:", error);
    return NextResponse.json({ error: "Failed to generate strategic insight" }, { status: 500 });
  }
}
