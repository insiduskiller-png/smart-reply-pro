import { NextResponse } from "next/server";
import { enforceRateLimit, getTierRateLimit } from "@/lib/rate-limit";
import { detectTone, generateReply, powerScoreAnalysis } from "@/lib/openai";
import { requireUser } from "@/lib/auth";
import {
  createConversationThread,
  getConversationMessagesByThread,
  getUserProfile,
  getConversationThreadById,
  insertConversation,
  insertConversationMessage,
  insertGeneration,
  supabaseService,
} from "@/lib/supabase";
import { sanitizeText } from "@/lib/security";
import { trackEvent } from "@/lib/analytics";

const proPremiumTones = ["Tactical Control", "Precision Authority", "Psychological Edge"];

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // EARLY AUTH: Fetch user profile immediately to enforce generation limits BEFORE any API calls
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

      // Enforce 5 generations per day for free tier
      if (generationCount >= 5) {
        return NextResponse.json(
          { 
            error: "Free limit reached. Upgrade to Pro for unlimited generations.",
            remaining: 0,
            limit: 5,
            used: generationCount
          },
          { status: 403 }
        );
      }

      // Pre-register this generation in usage_limits (BEFORE OpenAI call)
      const { error: insertError } = await supabaseService
        .from("usage_limits")
        .insert({ user_id: user.id });

      if (insertError) {
        console.error("Failed to record generation usage:", insertError);
        return NextResponse.json(
          { error: "Unable to process request. Please try again." },
          { status: 500 }
        );
      }
    }

    // NOW PROCESS REQUEST (limits already enforced)
    const body = await request.json().catch(() => ({}));
    const input = sanitizeText(body.input, 4000);
    const context = sanitizeText(body.context, 4000);
    const tone = sanitizeText(body.tone, 64) || "Neutral";
    const modifier = sanitizeText(body.modifier, 200);
    const requestedThreadId = sanitizeText(body.threadId, 80);
    const template = sanitizeText(body.template, 64);

    if (!input) return NextResponse.json({ error: "Input required" }, { status: 400 });

    let activeThread = requestedThreadId
      ? await getConversationThreadById(requestedThreadId, user.id)
      : null;

    if (!activeThread) {
      activeThread = await createConversationThread({
        userId: user.id,
        title: input.slice(0, 60) || "New Conversation",
      });
    }

    if (!activeThread) {
      return NextResponse.json(
        { error: "Failed to initialize conversation thread." },
        { status: 500 },
      );
    }

    // Check if free user selected premium style
    if (!isPro && proPremiumTones.includes(tone)) {
      return NextResponse.json(
        { error: "This style requires Pro plan." },
        { status: 403 }
      );
    }

    const previousMessages = await getConversationMessagesByThread({
      threadId: activeThread.id,
      userId: user.id,
      limit: 10,
    });

    const conversationHistory = previousMessages
      .slice()
      .reverse()
      .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
      .join("\n");

    const detectedTone = await detectTone(input);
    const outputs = isPro
      ? await Promise.all([
          generateReply({ input, context, tone, modifier, variant: "Balanced", conversationHistory, template }),
          generateReply({ input, context, tone, modifier, variant: "Stronger", conversationHistory, template }),
          generateReply({ input, context, tone, modifier, variant: "Softer", conversationHistory, template }),
        ])
      : [await generateReply({ input, context, tone, modifier, conversationHistory, template })];

    // Generate analysis for pro users
    let analysis = null;
    if (isPro) {
      try {
        const rawAnalysis = await powerScoreAnalysis(outputs[0], context);
        const parsed = JSON.parse(rawAnalysis);
        analysis = {
          tone_detected: parsed.tone_detected ?? "Neutral",
          pressure_level: parsed.pressure_level ?? 50,
          manipulation_detected: parsed.manipulation_detected ?? false,
        };
      } catch {
        // Silent fail - don't block response
      }
    }

    await insertGeneration({
      user_id: user.id,
      input_text: input,
      style: tone,
      generated_output: outputs[0],
    });

    await insertConversation({
      user_id: user.id,
      input_text: input,
      reply_text: outputs[0],
      tone,
    });

    await insertConversationMessage({
      threadId: activeThread.id,
      userId: user.id,
      role: "user",
      content: input,
    });

    await insertConversationMessage({
      threadId: activeThread.id,
      userId: user.id,
      role: "assistant",
      content: outputs[0],
    });

    // Track reply generation
    try {
      await trackEvent(
        "reply_generated",
        { tone, variant: isPro ? "Balanced" : undefined, isPro },
        user.id
      );
    } catch (analyticsErr) {
      console.debug("Failed to track reply generation:", analyticsErr);
    }

    return NextResponse.json({
      outputs,
      detectedTone,
      analysis,
      threadId: activeThread.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 },
    );
  }
}
