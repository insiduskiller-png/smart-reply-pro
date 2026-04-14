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

type OptionPlan = {
  label: "calm_boundary" | "direct_control" | "warmer_reset" | "concise_authority" | "repair_with_action";
  tone: string;
  variant: "Calm" | "Assertive" | "Strategic";
  directive: string;
  openingStyle: string;
};

function isPremiumTone(tone: string) {
  return proPremiumTones.includes(tone);
}

function buildOptionPlans(params: {
  baseTone: string;
  isProfessionalContext: boolean;
  isPro: boolean;
}): OptionPlan[] {
  const preferredBaseTone = !isPremiumTone(params.baseTone) || params.isPro ? params.baseTone : "Neutral";

  const proSafeTone = (preferred: string, fallback: string) => {
    if (isPremiumTone(preferred) && !params.isPro) {
      return fallback;
    }
    return preferred;
  };

  if (params.isProfessionalContext) {
    return [
      {
        label: "concise_authority",
        tone: proSafeTone("Precision Authority", preferredBaseTone),
        variant: "Strategic",
        openingStyle: "Start with immediate ownership + action.",
        directive:
          "Tactic: concise authority. No apology padding. State the action, one timeline, and one next step. Keep it 1-3 sentences.",
      },
      {
        label: "direct_control",
        tone: proSafeTone("Tactical Control", "Direct"),
        variant: "Assertive",
        openingStyle: "Start with a clear decision statement.",
        directive:
          "Tactic: direct control. Set frame and pace with calm command language. Be non-defensive and avoid polished manager-speak.",
      },
      {
        label: "repair_with_action",
        tone: proSafeTone("Direct", "Direct"),
        variant: "Calm",
        openingStyle: "Start with brief accountability, then recovery action.",
        directive:
          "Tactic: repair with action. If trust or quality concern exists, acknowledge once and immediately provide concrete recovery step with timing.",
      },
    ];
  }

  return [
    {
      label: "calm_boundary",
      tone: proSafeTone(preferredBaseTone, "Neutral"),
      variant: "Calm",
      openingStyle: "Start with one calm boundary line.",
      directive:
        "Tactic: calm boundary. Keep dignity and emotional control. Limit explanation and state clear limit in plain language.",
    },
    {
      label: "direct_control",
      tone: proSafeTone("Tactical Control", "Direct"),
      variant: "Assertive",
      openingStyle: "Start with a concise directional line.",
      directive:
        "Tactic: direct control. Reframe toward what will happen next. Avoid mirroring pressure, guilt, or manipulation.",
    },
    {
      label: "warmer_reset",
      tone: proSafeTone("Friendly", "Friendly"),
      variant: "Strategic",
      openingStyle: "Start with a warm reset line.",
      directive:
        "Tactic: warmer reset. Lower tension without surrendering position. Keep it natural and text-like, not formal.",
    },
  ];
}

function toTokenSet(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );
}

function jaccardSimilarity(a: string, b: string) {
  const first = toTokenSet(a);
  const second = toTokenSet(b);

  if (first.size === 0 && second.size === 0) {
    return 1;
  }

  let intersection = 0;
  for (const token of first) {
    if (second.has(token)) {
      intersection += 1;
    }
  }

  const union = first.size + second.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

function findTooSimilarOptionIndexes(outputs: string[], threshold = 0.72) {
  const indexes = new Set<number>();

  for (let i = 0; i < outputs.length; i += 1) {
    for (let j = i + 1; j < outputs.length; j += 1) {
      if (jaccardSimilarity(outputs[i], outputs[j]) >= threshold) {
        indexes.add(j);
      }
    }
  }

  return [...indexes];
}

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

    const professionalSignals = `${input} ${context} ${activeProfile.category || ""}`.toLowerCase();
    const isProfessionalContext =
      template === "work" ||
      template === "customer_service" ||
      /\b(work|office|manager|leadership|client|vendor|team|business|project|executive|vp|director)\b/.test(
        professionalSignals,
      );

    const optionPlans = buildOptionPlans({
      baseTone: tone,
      isProfessionalContext,
      isPro,
    });

    let outputs = await Promise.all(
      optionPlans.map((plan, index) =>
        generateReply({
          input,
          context,
          tone: plan.tone,
          modifier: [
            modifier,
            `Option Role: ${plan.label}`,
            plan.directive,
            `Opening Style: ${plan.openingStyle}`,
            "This option must be tactically distinct from sibling options in opening, structure, and strategic move.",
            `Do not reuse core wording likely used in the other options. Option index: ${index + 1}/3.`,
          ]
            .filter(Boolean)
            .join("\n"),
          variant: plan.variant,
          conversationHistory,
          template,
          profileContext: styleContext,
        }),
      ),
    );

    const tooSimilarIndexes = findTooSimilarOptionIndexes(outputs);
    if (tooSimilarIndexes.length > 0) {
      const regenerated = await Promise.all(
        tooSimilarIndexes.map((index) => {
          const plan = optionPlans[index];
          const siblingText = outputs
            .filter((_, idx) => idx !== index)
            .map((text, idx) => `Sibling ${idx + 1}: ${text}`)
            .join("\n");

          return generateReply({
            input,
            context,
            tone: plan.tone,
            modifier: [
              modifier,
              `Option Role: ${plan.label}`,
              plan.directive,
              `Opening Style: ${plan.openingStyle}`,
              "DIVERGENCE PASS: This option was too similar to siblings.",
              "Rewrite to be tactically distinct in framing, pacing, and emotional temperature.",
              "Use different sentence architecture and different lead sentence from siblings.",
              siblingText,
            ]
              .filter(Boolean)
              .join("\n"),
            variant: plan.variant,
            conversationHistory,
            template,
            profileContext: styleContext,
          });
        }),
      );

      tooSimilarIndexes.forEach((index, i) => {
        outputs[index] = regenerated[i];
      });
    }

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

    // Save all 3 generated variants as assistant suggestions so the profile
    // memory sees the full range of options, not just the first variant.
    // user_reply is intentionally omitted here — it should be recorded only
    // when the user explicitly picks and copies/saves a specific reply.
    for (const output of outputs) {
      await insertProfileMessage({
        profileId: activeProfile.id,
        userId: user.id,
        role: "assistant_suggestion",
        content: output,
      });
    }

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
      optionPlans: optionPlans.map((plan) => ({ label: plan.label, tone: plan.tone, variant: plan.variant })),
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
