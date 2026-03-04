import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getUserProfile, supabaseService } from "@/lib/supabase";
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
    const isPro = (profile?.subscription_status ?? "free").toLowerCase() === "pro";

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
