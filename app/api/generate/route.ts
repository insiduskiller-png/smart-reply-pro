import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
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

const proPremiumTones = ["Tactical Control", "Precision Authority", "Psychological Edge"];

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
    const tone = sanitizeText(body.tone, 64) || "Neutral";
    const modifier = sanitizeText(body.modifier, 200);
    const requestedThreadId = sanitizeText(body.threadId, 80);

    if (!input) return NextResponse.json({ error: "Input required" }, { status: 400 });

    const profile = await getUserProfile(user.id);
    const isPro = profile?.subscription_status === "pro";

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

    // Check generation limits for free users (max 6 per 24 hours)
    if (!isPro) {
      // Calculate 24 hours ago
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Count generations in the last 24 hours
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
          { error: "Daily limit reached. Upgrade to Pro." },
          { status: 403 }
        );
      }

      // Insert usage limit row BEFORE generation (after check passes)
      await supabaseService
        .from("usage_limits")
        .insert({
          user_id: user.id,
        });
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
          generateReply({ input, context, tone, modifier, variant: "Balanced", conversationHistory }),
          generateReply({ input, context, tone, modifier, variant: "Stronger", conversationHistory }),
          generateReply({ input, context, tone, modifier, variant: "Softer", conversationHistory }),
        ])
      : [await generateReply({ input, context, tone, modifier, conversationHistory })];

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
