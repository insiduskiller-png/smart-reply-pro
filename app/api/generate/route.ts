import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { detectTone, generateReply } from "@/lib/openai";
import { requireUser } from "@/lib/auth";
import { getUserProfile, insertGeneration, patchUserProfile } from "@/lib/supabase";

function sanitize(value: string) {
  return value.replace(/[<>]/g, "").slice(0, 4000);
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rate = enforceRateLimit(user.id);
  if (!rate.allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const body = await request.json();
  const input = sanitize(body.input || "");
  const context = sanitize(body.context || "");
  const tone = sanitize(body.tone || "Professional");

  if (!input) return NextResponse.json({ error: "Input required" }, { status: 400 });

  const profile = await getUserProfile(user.id);
  const isPro = profile?.subscription_status === "pro";

  const lastReset = profile?.last_usage_reset ? new Date(profile.last_usage_reset) : new Date();
  const now = new Date();
  let usageCount = profile?.daily_usage_count ?? 0;

  if (lastReset.toDateString() !== now.toDateString()) {
    usageCount = 0;
    await patchUserProfile(user.id, { daily_usage_count: 0, last_usage_reset: now.toISOString() });
  }

  if (!isPro && usageCount >= 5) {
    return NextResponse.json({ error: "Daily free limit reached" }, { status: 403 });
  }

  const detectedTone = await detectTone(input);
  const outputs = isPro
    ? await Promise.all([
        generateReply({ input, context, tone, modifier: body.modifier, variant: "Balanced" }),
        generateReply({ input, context, tone, modifier: body.modifier, variant: "Stronger" }),
        generateReply({ input, context, tone, modifier: body.modifier, variant: "Softer" }),
      ])
    : [await generateReply({ input, context, tone, modifier: body.modifier })];

  await insertGeneration({
    user_id: user.id,
    input_text: input,
    style: tone,
    generated_output: outputs[0],
  });

  await patchUserProfile(user.id, { daily_usage_count: usageCount + 1 });

  return NextResponse.json({ outputs, detectedTone });
}
