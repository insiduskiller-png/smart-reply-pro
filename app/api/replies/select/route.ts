import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { insertProfileMessage, upsertUserPreferenceState, updateLearnedStyleFromBehavior, supabaseService } from "@/lib/supabase";
import { sanitizeText } from "@/lib/security";
import { inferTraitDeltasFromSelection } from "@/lib/style-learning";

/**
 * POST /api/replies/select
 *
 * Records the user's chosen reply option from a generation batch.
 * This is the primary behavioral learning loop entry point (Phase 3).
 *
 * What this does:
 * 1. Inserts a `user_reply` profile message — style memory trains on actual chosen replies.
 * 2. Updates user_preference_state counters (tone/variant/index frequencies).
 * 3. Applies a behavioral trait delta to user_learned_style (fire-and-forget).
 *    This is the Phase 3 closed loop: user selects → learned traits update →
 *    next generation reads updated traits via mergeEffectiveStyle().
 *
 * Body: {
 *   profileId:       string        — reply profile the message belongs to
 *   generationId:    string        — batch UUID from the generate response
 *   selectedIndex:   number        — 0 | 1 | 2
 *   selectedText:    string        — full text of the chosen reply
 *   tone:            string        — tone label of the generation request
 *   variant:         string        — variant label of the selected option
 *   contextCategory: string        — context_category from messageAnalysis
 *   optionPlanLabel: string        — plan label (e.g. "calm_boundary") of selected option
 *   signalStrength:  number        — 0.0–1.0; 1.0=saved, 0.8=copied, 0.5=selected
 *   totalSelections: number        — running total from user_preference_state (for sparsity guard)
 * }
 */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));

    const profileId       = sanitizeText(body.profileId, 80);
    const generationId    = sanitizeText(body.generationId, 80);
    const selectedText    = sanitizeText(body.selectedText, 4000);
    const tone            = sanitizeText(body.tone, 64) || "Neutral";
    const variant         = sanitizeText(body.variant, 64) || "Calm";
    const contextCategory = sanitizeText(body.contextCategory, 32) || "general";
    const optionPlanLabel = sanitizeText(body.optionPlanLabel, 64) || "";

    const selectedIndex =
      typeof body.selectedIndex === "number" && [0, 1, 2].includes(body.selectedIndex)
        ? body.selectedIndex
        : null;

    const signalStrength: number =
      typeof body.signalStrength === "number"
        ? Math.max(0, Math.min(1, body.signalStrength))
        : 0.8; // default: copy-strength

    const totalSelections: number =
      typeof body.totalSelections === "number" ? body.totalSelections : 0;

    if (!profileId || !selectedText || selectedIndex === null) {
      return NextResponse.json(
        { error: "profileId, selectedText, and selectedIndex (0–2) are required." },
        { status: 400 },
      );
    }

    // 1. Insert user_reply profile message — style memory trains on actual chosen replies.
    //    Idempotency guard: skip if this (generationId, selectedIndex) user_reply already exists.
    //    This prevents double-inserts when the user copies then saves the same reply.
    let alreadyRecorded = false;
    if (generationId) {
      const { count } = await supabaseService
        .from("profile_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("generation_id", generationId)
        .eq("selected_option_index", selectedIndex)
        .eq("role", "user_reply");
      alreadyRecorded = (count ?? 0) > 0;
    }

    if (!alreadyRecorded) {
      await insertProfileMessage({
        profileId,
        userId: user.id,
        role: "user_reply",
        content: selectedText,
        generationId: generationId || undefined,
        selectedOptionIndex: selectedIndex,
      });
    } else {
      console.debug("[Phase3:select] user_reply already recorded — skipping insert", {
        userId: user.id,
        generationId,
        selectedIndex,
      });
    }

    // 2. Update behavioral preference state counters (fire-and-forget)
    upsertUserPreferenceState({
      userId: user.id,
      selectedTone: tone,
      selectedVariant: variant,
      selectedOptionIndex: selectedIndex,
      contextCategory,
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Phase3:select] preference-state update failed", {
        userId: user.id,
        error: msg,
        ts: new Date().toISOString(),
      });
    });

    // 3. Phase 3: apply behavioral trait delta to user_learned_style (fire-and-forget)
    const traitDelta = inferTraitDeltasFromSelection(optionPlanLabel, tone);
    updateLearnedStyleFromBehavior(user.id, traitDelta, signalStrength, totalSelections).catch(
      (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[Phase3:select] trait-delta update failed", {
          userId: user.id,
          optionPlanLabel,
          tone,
          signalStrength,
          error: msg,
          ts: new Date().toISOString(),
        });
      },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Selection tracking failed" },
      { status: 500 },
    );
  }
}
