import { NextResponse } from "next/server";
import { enforceRateLimit, getTierRateLimit } from "@/lib/rate-limit";
import { detectTone, generateProfileSummary, generateReply, generateStyleSummary, powerScoreAnalysis } from "@/lib/openai";
import { requireUser } from "@/lib/auth";
import {
  incrementReplyProfileInteraction,
  getProfileMessageCount,
  getProfileMessagesByProfile,
  getReplyProfileById,
  insertConversation,
  insertProfileMessage,
  insertGeneration,
  touchReplyProfileActivity,
  updateReplyProfileSummary,
  updateReplyProfileStyleMemory,
} from "@/lib/supabase";
import { sanitizeText } from "@/lib/security";
import { trackEvent } from "@/lib/analytics";
import { hasProAccess, PRO_ENABLED } from "@/lib/billing";
import { bootstrapUserProfile } from "@/lib/profile-service";

const proPremiumTones = ["Tactical Control", "Precision Authority", "Psychological Edge"];

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // EARLY AUTH: Fetch user profile immediately to enforce generation limits BEFORE any API calls
    const { profile } = await bootstrapUserProfile(user, { source: "api-generate" });

    const isPro = hasProAccess(profile.subscription_status);

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

    // NOW PROCESS REQUEST (limits already enforced)
    const body = await request.json().catch(() => ({}));
    const input = sanitizeText(body.input, 4000);
    const context = sanitizeText(body.context, 4000);
    const tone = sanitizeText(body.tone, 64) || "Neutral";
    const modifier = sanitizeText(body.modifier, 200);
    const requestedProfileId = sanitizeText(body.profileId, 80);
    const template = sanitizeText(body.template, 64);

    if (!input) return NextResponse.json({ error: "Input required" }, { status: 400 });

    if (!requestedProfileId) {
      return NextResponse.json({ error: "Select an active Reply Profile first." }, { status: 400 });
    }

    const activeProfile = await getReplyProfileById(requestedProfileId, user.id);
    if (!activeProfile) {
      return NextResponse.json({ error: "Reply Profile not found." }, { status: 404 });
    }

    // Check if free user selected premium style
    if (!isPro && proPremiumTones.includes(tone)) {
      return NextResponse.json(
        { error: PRO_ENABLED ? "This style requires Pro plan." : "Advanced styles will be available in Pro." },
        { status: 403 }
      );
    }

    const previousMessages = await getProfileMessagesByProfile({
      profileId: activeProfile.id,
      userId: user.id,
      limit: 20,
    });

    const conversationHistory = previousMessages
      .slice()
      .reverse()
      .map((message) => {
        if (message.role === "incoming") return `Incoming: ${message.content}`;
        if (message.role === "user_reply") return `User Reply: ${message.content}`;
        if (message.role === "history_import") return `Imported History: ${message.content}`;
        return `Assistant Suggestion: ${message.content}`;
      })
      .join("\n");

    const detectedTone = await detectTone(input);
    const styleContext = {
      contactName: activeProfile.profile_name,
      relationshipType: activeProfile.category || "Unspecified",
      contextNotes: activeProfile.context_notes ?? undefined,
      styleSummary: activeProfile.style_memory ?? undefined,
      profileSummary: activeProfile.profile_summary ?? undefined,
    };

    const variants = ["Calm", "Assertive", "Strategic"] as const;
    const outputs = await Promise.all(
      variants.map((variant) =>
        generateReply({
          input,
          context,
          tone,
          modifier,
          variant,
          conversationHistory,
          template,
          profileContext: styleContext,
        }),
      ),
    );

    let analyses: Array<{
      reply_score: number;
      clarity: "Low" | "Medium" | "High";
      influence: "Low" | "Medium" | "High";
      tone_detected: string;
      pressure_level: number;
      manipulation_risk: "None" | "Low" | "Medium" | "High";
    }> = [];

    try {
      const rawAnalyses = await Promise.all(outputs.map((reply) => powerScoreAnalysis(reply, context)));
      analyses = rawAnalyses.map((raw) => {
        const parsed = JSON.parse(raw);
        return {
          reply_score: parsed.reply_score ?? 75,
          clarity: parsed.clarity ?? "Medium",
          influence: parsed.influence ?? "Medium",
          tone_detected: parsed.tone_detected ?? "Neutral",
          pressure_level: parsed.pressure_level ?? 50,
          manipulation_risk: parsed.manipulation_risk ?? (parsed.manipulation_detected ? "Medium" : "None"),
        };
      });
    } catch {
      analyses = outputs.map(() => ({
        reply_score: 75,
        clarity: "Medium",
        influence: "Medium",
        tone_detected: "Neutral",
        pressure_level: 50,
        manipulation_risk: "None",
      }));
    }

    const recommendedIndex = analyses.reduce((bestIndex, current, currentIndex, arr) => {
      if (arr[bestIndex]?.reply_score === undefined) return currentIndex;
      return current.reply_score > arr[bestIndex].reply_score ? currentIndex : bestIndex;
    }, 0);

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

    await insertProfileMessage({
      profileId: activeProfile.id,
      userId: user.id,
      role: "incoming",
      content: input,
    });

    await insertProfileMessage({
      profileId: activeProfile.id,
      userId: user.id,
      role: "assistant_suggestion",
      content: outputs[0],
    });

    await insertProfileMessage({
      profileId: activeProfile.id,
      userId: user.id,
      role: "user_reply",
      content: outputs[0],
    });

    await touchReplyProfileActivity(activeProfile.id, user.id);

    const interactionUpdate = await incrementReplyProfileInteraction({
      profileId: activeProfile.id,
      userId: user.id,
    });

    // Controlled learning loop: style memory stays primary; summary refreshes periodically.
    try {
      const interactionCount = Number(interactionUpdate?.interaction_count ?? activeProfile.interaction_count ?? 0);
      const summaryRefreshInterval = 4;

      // Keep existing style memory refresh behavior intact.
      const profileMessageCount = await getProfileMessageCount({
        profileId: activeProfile.id,
        userId: user.id,
      });

      if (profileMessageCount >= 4 && profileMessageCount % 4 === 0) {
        const styleMessages = await getProfileMessagesByProfile({
          profileId: activeProfile.id,
          userId: user.id,
          limit: 60,
        });

        const userStyleCorpus = styleMessages
          .slice()
          .reverse()
          .filter((message) => message.role === "user_reply" || message.role === "history_import")
          .map((message) => message.content)
          .join("\n\n");

        if (userStyleCorpus) {
          const styleRaw = await generateStyleSummary({
            contactName: activeProfile.profile_name,
            relationshipType: activeProfile.category || "Unspecified",
            contextNotes: activeProfile.context_notes ?? undefined,
            chatHistory: userStyleCorpus,
          });

          const parsedStyle = JSON.parse(styleRaw);
          await updateReplyProfileStyleMemory({
            profileId: activeProfile.id,
            userId: user.id,
            styleMemory: parsedStyle?.summary,
          });
        }
      }

      // Refresh lightweight intelligence summary every N interactions.
      if (interactionCount > 0 && interactionCount % summaryRefreshInterval === 0) {
        const latestProfile = await getReplyProfileById(activeProfile.id, user.id);
        const profileSummaryRaw = await generateProfileSummary({
          contactName: latestProfile?.profile_name || activeProfile.profile_name,
          relationshipType: latestProfile?.category || activeProfile.category || "Unspecified",
          contextNotes: latestProfile?.context_notes ?? activeProfile.context_notes ?? undefined,
          styleMemory: latestProfile?.style_memory ?? activeProfile.style_memory ?? undefined,
        });

        await updateReplyProfileSummary({
          profileId: activeProfile.id,
          userId: user.id,
          profileSummary: sanitizeText(profileSummaryRaw, 1200) || null,
        });
      }
    } catch (styleUpdateErr) {
      console.debug("Dynamic profile intelligence refresh skipped:", styleUpdateErr);
    }

    // Track reply generation
    try {
      await trackEvent(
        "reply_generated",
        { tone, variant: isPro ? "Calm" : undefined, isPro },
        user.id
      );
    } catch (analyticsErr) {
      console.debug("Failed to track reply generation:", analyticsErr);
    }

    return NextResponse.json({
      outputs,
      detectedTone,
      analyses,
      recommendedIndex,
      profileId: activeProfile.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 },
    );
  }
}
