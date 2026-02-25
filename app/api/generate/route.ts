import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { detectTone, generateReply } from "@/lib/openai";
import { requireUser } from "@/lib/auth";
import {
  getUserProfile,
  insertGeneration,
  patchUserProfile,
  upsertUserProfile,
} from "@/lib/supabase";
import { sanitizeText } from "@/lib/security";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rate = enforceRateLimit(user.id);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const input = sanitizeText(body.input, 4000);
    const context = sanitizeText(body.context, 4000);
    const tone = sanitizeText(body.tone, 64) || "Professional";
    const modifier = sanitizeText(body.modifier, 200);

    if (!input) return NextResponse.json({ error: "Input required" }, { status: 400 });

    await upsertUserProfile({ id: user.id, email: user.email });
    const profile = await getUserProfile(user.id);
    const isPro = profile?.subscription_status === "pro";

    const now = new Date();
    const lastReset = profile?.last_usage_reset
      ? new Date(profile.last_usage_reset)
      : now;
    let usageCount = profile?.daily_usage_count ?? 0;

    if (lastReset.toDateString() !== now.toDateString()) {
      usageCount = 0;
      await patchUserProfile(user.id, {
        daily_usage_count: 0,
        last_usage_reset: now.toISOString(),
      });
    }

    if (!isPro && usageCount >= 5) {
      return NextResponse.json({ error: "Daily limit reached" }, { status: 403 });
    }

    const detectedTone = await detectTone(input);
    const outputs = isPro
      ? await Promise.all([
          generateReply({ input, context, tone, modifier, variant: "Balanced" }),
          generateReply({ input, context, tone, modifier, variant: "Stronger" }),
          generateReply({ input, context, tone, modifier, variant: "Softer" }),
        ])
      : [await generateReply({ input, context, tone, modifier })];

    await insertGeneration({
      user_id: user.id,
      input_text: input,
      style: tone,
      generated_output: outputs[0],
    });

    if (!isPro) {
      await patchUserProfile(user.id, {
        daily_usage_count: usageCount + 1,
        last_usage_reset: now.toISOString(),
      });
    }

    return NextResponse.json({ outputs, detectedTone });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 },
    );
  }
}
