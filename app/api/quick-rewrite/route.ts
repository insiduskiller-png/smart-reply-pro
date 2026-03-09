import { NextResponse } from "next/server";
import { enforceRateLimit, getTierRateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/security";
import { rewriteReplyWithInstruction } from "@/lib/openai";
import { getUserProfile, supabaseService } from "@/lib/supabase";

type QuickRewriteMode = "Shorter" | "More Direct" | "More Polite" | "Stronger";

const QUICK_REWRITE_INSTRUCTIONS: Record<QuickRewriteMode, string> = {
  Shorter: "Rewrite the reply in fewer words without losing meaning.",
  "More Direct": "Rewrite the reply to be more direct and assertive.",
  "More Polite": "Rewrite the reply to sound warmer and polite.",
  Stronger: "Rewrite the reply to increase authority and confidence.",
};

function isQuickRewriteMode(value: string): value is QuickRewriteMode {
  return (
    value === "Shorter" ||
    value === "More Direct" ||
    value === "More Polite" ||
    value === "Stronger"
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

    // ENFORCE GENERATION LIMITS (free tier only, before any OpenAI calls)
    if (!isPro) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: limitData, error: limitError, count } = await supabaseService
        .from("usage_limits")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .gte("created_at", twentyFourHoursAgo);

      if (limitError) {
        console.error("Generation limit check error:", limitError);
      }

      const generationCount = count ?? 0;

      if (generationCount >= 5) {
        return NextResponse.json(
          {
            error: "Free limit reached. Upgrade to Pro for unlimited rewrites.",
            remaining: 0,
            limit: 5,
            used: generationCount
          },
          { status: 403 }
        );
      }

      // Pre-register this rewrite in usage_limits (BEFORE OpenAI call)
      const { error: insertError } = await supabaseService
        .from("usage_limits")
        .insert({ user_id: user.id });

      if (insertError) {
        console.error("Failed to record rewrite usage:", insertError);
        return NextResponse.json(
          { error: "Unable to process request. Please try again." },
          { status: 500 }
        );
      }
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
