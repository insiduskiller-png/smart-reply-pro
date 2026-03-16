import { NextResponse } from "next/server";
import { enforceRateLimit, getTierRateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/security";
import { rewriteReplyWithInstruction } from "@/lib/openai";
import { getUserProfile } from "@/lib/supabase";

type QuickRewriteMode = "Shorter" | "More Direct" | "More Polite" | "More Assertive";

const QUICK_REWRITE_INSTRUCTIONS: Record<QuickRewriteMode, string> = {
  Shorter: "Rewrite the reply in fewer words without losing meaning.",
  "More Direct": "Rewrite the reply to be more direct and assertive.",
  "More Polite": "Rewrite the reply to sound warmer and polite.",
  "More Assertive": "Rewrite the reply to increase authority and confidence.",
};

function isQuickRewriteMode(value: string): value is QuickRewriteMode {
  return (
    value === "Shorter" ||
    value === "More Direct" ||
    value === "More Polite" ||
    value === "More Assertive"
  );
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await getUserProfile(user.id);
    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 400 });
    }

    const isPro = profile.subscription_status === "pro";

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

    const body = await request.json().catch(() => ({}));
    const reply = sanitizeText(body.reply, 4000);
    const mode = sanitizeText(body.mode, 24);

    if (!reply || !mode || !isQuickRewriteMode(mode)) {
      return NextResponse.json({ error: "Valid reply and mode are required" }, { status: 400 });
    }

    const rewritten = await rewriteReplyWithInstruction(reply, QUICK_REWRITE_INSTRUCTIONS[mode]);

    return NextResponse.json({ reply: rewritten, mode });
  } catch (error) {
    console.error("Quick rewrite error:", error);
    return NextResponse.json({ error: "Quick rewrite failed" }, { status: 500 });
  }
}
