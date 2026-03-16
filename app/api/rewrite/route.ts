import { NextResponse } from "next/server";
import { enforceRateLimit, getTierRateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/auth";
import { getUserProfile } from "@/lib/supabase";
import { sanitizeText } from "@/lib/security";
import { rewriteReplyWithInstruction } from "@/lib/openai";

type RewriteMode = "Lawyer Mode" | "Negotiator Mode" | "Manager Mode";

const MODE_INSTRUCTIONS: Record<RewriteMode, string> = {
  "Lawyer Mode":
    "Rewrite the reply to sound legally precise, structured, and risk-aware. Remove emotional language. Increase clarity and authority.",
  "Negotiator Mode":
    "Rewrite the reply to maximize negotiation leverage. Maintain calm authority and preserve options.",
  "Manager Mode":
    "Rewrite the reply in a confident leadership tone. Clear expectations. Professional authority.",
};

function isRewriteMode(value: string): value is RewriteMode {
  return value === "Lawyer Mode" || value === "Negotiator Mode" || value === "Manager Mode";
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

    const isPro = (profile.subscription_status ?? "free").toLowerCase() === "pro";

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
    const mode = sanitizeText(body.mode, 32);

    if (!reply || !mode || !isRewriteMode(mode)) {
      return NextResponse.json({ error: "Valid reply and mode are required" }, { status: 400 });
    }

    const rewritten = await rewriteReplyWithInstruction(reply, MODE_INSTRUCTIONS[mode]);

    return NextResponse.json({ reply: rewritten, mode });
  } catch (error) {
    console.error("Rewrite error:", error);
    return NextResponse.json({ error: "Rewrite failed" }, { status: 500 });
  }
}
