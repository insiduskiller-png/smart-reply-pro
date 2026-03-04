import { NextResponse } from "next/server";
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
    const isPro = profile?.subscription_status === "pro";

    // Check generation limits for free users (max 6 per 24 hours)
    if (!isPro) {
      // Calculate 24 hours ago
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Count generations and rewrites in the last 24 hours
      const { data: limitData, error: limitError } = await supabaseService
        .from("usage_limits")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .gte("created_at", twentyFourHoursAgo);

      if (limitError) {
        console.error("Generation limit check error:", limitError);
      }

      const generationCount = limitData?.length ?? 0;

      if (generationCount >= 6) {
        return NextResponse.json(
          { error: "Daily limit reached. Upgrade to Pro for unlimited rewrites." },
          { status: 403 }
        );
      }

      // Insert usage limit row BEFORE rewrite (after check passes)
      await supabaseService
        .from("usage_limits")
        .insert({
          user_id: user.id,
        });
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
