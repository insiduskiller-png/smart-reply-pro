import { NextResponse } from "next/server";
import { enforceRateLimit, getTierRateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/auth";
import { getUserProfile } from "@/lib/supabase";
import { powerScoreAnalysis } from "@/lib/openai";
import { sanitizeText } from "@/lib/security";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getUserProfile(user.id);
  if (profile?.subscription_status !== "pro") {
    return NextResponse.json({ error: "Pro required" }, { status: 403 });
  }

  // APPLY RATE LIMITING (Pro: 30/min)
  const { limit: rateLimit, windowMs } = getTierRateLimit(true);
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
    if (!input) return NextResponse.json({ error: "Input required" }, { status: 400 });

    const raw = await powerScoreAnalysis(input, context);

    try {
      const parsed = JSON.parse(raw);
      return NextResponse.json({
        score: parsed.score ?? 50,
        leverage: parsed.leverage ?? "Balanced",
        assertiveness_score: parsed.assertiveness_score ?? 50,
        tone_detected: parsed.tone_detected ?? "Neutral",
        pressure_level: parsed.pressure_level ?? 50,
        risks: parsed.risks ?? [],
        manipulation_detected: parsed.manipulation_detected ?? false,
      });
    } catch {
      return NextResponse.json({
        score: 50,
        leverage: "Balanced",
        assertiveness_score: 50,
        tone_detected: "Neutral",
        pressure_level: 50,
        risks: ["Parsing fallback"],
        manipulation_detected: false,
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Power score failed" },
      { status: 500 },
    );
  }
}
