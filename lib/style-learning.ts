/**
 * lib/style-learning.ts
 *
 * Phase 2: Persistent adaptive style trait memory.
 *
 * This module owns:
 *   - Types for learned style traits
 *   - Default/neutral trait values
 *   - Mapping from generateStyleSummary() JSON → trait scores
 *   - Merge logic: profile style_memory (per-contact) + learned traits (per-user) → effective style for prompt
 *
 * What this is NOT:
 *   - This is not behavioral event learning (Phase 3).
 *   - Traits are seeded from AI-observed message history via generateStyleSummary().
 *   - No continuous background adaptation until Phase 3 is implemented.
 *
 * Confidence scale:
 *   0.0  = default, no real data
 *   0.3  = weak signal (one ambiguous observation)
 *   0.5  = one clear style observation
 *   0.7  = two consistent observations
 *   0.85 = three+ consistent observations
 *   1.0  = maximum (well-established, many observations)
 *
 * Score scale:
 *   0.0  = very low (e.g. very indirect, very brief, very cold)
 *   0.5  = neutral / no clear lean
 *   1.0  = very high (e.g. very direct, very warm, very formal)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type StyleTrait = {
  score: number;       // 0.0–1.0
  confidence: number;  // 0.0–1.0
  is_default: boolean; // true = never seeded from real data
};

export type LearnedStyleTraits = {
  directness:        StyleTrait;
  warmth:            StyleTrait;
  brevity:           StyleTrait;
  assertiveness:     StyleTrait;
  politeness:        StyleTrait;
  boundary_strength: StyleTrait;
  professionalism:   StyleTrait;
  humor:             StyleTrait;
};

export type UserLearnedStyle = {
  traits: LearnedStyleTraits;
  observation_count: number;
};

/**
 * The final merged style object produced by mergeEffectiveStyle().
 *
 * `text`   — injected directly into the generation prompt (REPLY PROFILE section).
 * `traits` — structured trait snapshot for Phase 3 behavioral update logic to read.
 *            Null when no learned data exists yet.
 * `observation_count` — how many style-summary observations have been merged.
 *                       Phase 3 uses this to weight behavioral adjustments.
 * `has_learned_contribution` — true when learned cross-profile traits influenced `text`.
 */
export type EffectiveStyleSummary = {
  text: string;
  traits: LearnedStyleTraits | null;
  observation_count: number;
  has_learned_contribution: boolean;
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_STYLE_TRAITS: LearnedStyleTraits = {
  directness:        { score: 0.5, confidence: 0.0, is_default: true },
  warmth:            { score: 0.5, confidence: 0.0, is_default: true },
  brevity:           { score: 0.5, confidence: 0.0, is_default: true },
  assertiveness:     { score: 0.5, confidence: 0.0, is_default: true },
  politeness:        { score: 0.5, confidence: 0.0, is_default: true },
  boundary_strength: { score: 0.5, confidence: 0.0, is_default: true },
  professionalism:   { score: 0.5, confidence: 0.0, is_default: true },
  humor:             { score: 0.5, confidence: 0.0, is_default: true },
};

// Confidence added per new style-memory observation (grows toward 1.0 asymptotically)
const OBSERVATION_CONFIDENCE_STEP = 0.15;
const SEED_BASE_CONFIDENCE = 0.5; // first observation confidence

// Traits must meet this confidence threshold to influence the prompt
const PROMPT_CONFIDENCE_THRESHOLD = 0.4;

// Traits must meet this threshold to be presented as "established"
const HIGH_CONFIDENCE_THRESHOLD = 0.6;

// ─── Style memory → trait mapping ─────────────────────────────────────────────

/**
 * Maps the JSON object returned by generateStyleSummary() to a partial
 * LearnedStyleTraits update.
 *
 * Input: the full parsed JSON from generateStyleSummary(), e.g.:
 *   { directness_level: "high", sentence_length: "short", assertiveness_level: "assertive", ... }
 *
 * Output: partial trait updates with confidence = SEED_BASE_CONFIDENCE.
 * These are merged with any existing learned traits by the Supabase helper.
 */
export function mapStyleMemoryToTraits(
  styleJson: Record<string, string>,
): Partial<LearnedStyleTraits> {
  const result: Partial<LearnedStyleTraits> = {};
  const conf = SEED_BASE_CONFIDENCE;

  // directness_level: "low" | "medium" | "high"
  if (styleJson.directness_level) {
    result.directness = {
      score:
        styleJson.directness_level === "high"
          ? 0.85
          : styleJson.directness_level === "low"
          ? 0.2
          : 0.5,
      confidence: conf,
      is_default: false,
    };
  }

  // assertiveness_level: "passive" | "balanced" | "assertive"
  if (styleJson.assertiveness_level) {
    result.assertiveness = {
      score:
        styleJson.assertiveness_level === "assertive"
          ? 0.85
          : styleJson.assertiveness_level === "passive"
          ? 0.2
          : 0.5,
      confidence: conf,
      is_default: false,
    };
  }

  // formality_level: "casual" | "semi-formal" | "formal"
  if (styleJson.formality_level) {
    result.professionalism = {
      score:
        styleJson.formality_level === "formal"
          ? 0.9
          : styleJson.formality_level === "casual"
          ? 0.15
          : 0.5,
      confidence: conf,
      is_default: false,
    };
  }

  // sentence_length: "short" | "medium" | "long" → brevity (inverse)
  if (styleJson.sentence_length) {
    result.brevity = {
      score:
        styleJson.sentence_length === "short"
          ? 0.85
          : styleJson.sentence_length === "long"
          ? 0.15
          : 0.5,
      confidence: conf,
      is_default: false,
    };
  }

  // boundary_tolerance: free text, look for signal words
  if (styleJson.boundary_tolerance) {
    const bt = styleJson.boundary_tolerance.toLowerCase();
    const isExplicit =
      bt.includes("clear") || bt.includes("direct") || bt.includes("explicit") || bt.includes("firm");
    const isWeak =
      bt.includes("rarely") || bt.includes("weak") || bt.includes("vague") || bt.includes("avoid");
    result.boundary_strength = {
      score: isExplicit ? 0.8 : isWeak ? 0.25 : 0.5,
      confidence: conf * 0.8, // boundary_tolerance is a text field — slightly less reliable
      is_default: false,
    };
  }

  // validation_seeking: "low" | "medium" | "high"
  // High validation-seeking → polite/deferential. Low → more assertive/blunt.
  if (styleJson.validation_seeking) {
    result.politeness = {
      score:
        styleJson.validation_seeking === "high"
          ? 0.8
          : styleJson.validation_seeking === "low"
          ? 0.3
          : 0.5,
      confidence: conf * 0.75, // indirect mapping
      is_default: false,
    };
  }

  // emoji_usage: "low" | "medium" | "high"
  // High emoji use is a humor/warmth signal; low is a professionalism/seriousness signal.
  if (styleJson.emoji_usage) {
    const eu = styleJson.emoji_usage;
    result.humor = {
      score: eu === "high" ? 0.75 : eu === "low" ? 0.2 : 0.5,
      confidence: conf * 0.75, // reliable enumerated field
      is_default: false,
    };
  }

  // conflict_style: free text describing how the user handles disagreement
  // Assertive/direct conflict approach → high assertiveness + boundary_strength.
  if (styleJson.conflict_style) {
    const cs = styleJson.conflict_style.toLowerCase();
    const isAssertive =
      cs.includes("direct") || cs.includes("assertive") || cs.includes("confront") || cs.includes("firm");
    const isAvoidant =
      cs.includes("avoid") || cs.includes("defer") || cs.includes("passive") || cs.includes("back down");
    if (isAssertive || isAvoidant) {
      // Only update assertiveness if not already set by assertiveness_level (don't clobber)
      if (!result.assertiveness) {
        result.assertiveness = {
          score: isAssertive ? 0.8 : 0.25,
          confidence: conf * 0.7, // text field — moderate reliability
          is_default: false,
        };
      }
    }
  }

  // tone_pattern: free text — extract warmth and humor signals
  // Note: emoji_usage already seeds humor above; tone_pattern can reinforce or override it.
  if (styleJson.tone_pattern) {
    const tp = styleJson.tone_pattern.toLowerCase();

    // Warmth
    const isWarm =
      tp.includes("warm") || tp.includes("friendly") || tp.includes("caring") || tp.includes("empathetic");
    const isCold =
      tp.includes("cold") || tp.includes("dry") || tp.includes("detached") || tp.includes("distant");
    if (isWarm || isCold) {
      result.warmth = {
        score: isWarm ? 0.8 : 0.2,
        confidence: conf * 0.8,
        is_default: false,
      };
    }

    // Humor — if emoji_usage already provided a score, average in the tone_pattern signal
    const hasHumor =
      tp.includes("playful") || tp.includes("humor") || tp.includes("wit") || tp.includes("sarcasm") || tp.includes("light");
    const isSerious = tp.includes("serious") || tp.includes("formal") || tp.includes("no humor");
    if (hasHumor || isSerious) {
      const toneScore = hasHumor ? 0.75 : 0.2;
      const existing = result.humor;
      result.humor = {
        score: existing ? (existing.score + toneScore) / 2 : toneScore,
        confidence: existing ? Math.min(0.95, existing.confidence + 0.1) : conf * 0.7,
        is_default: false,
      };
    }
  }

  return result;
}

/**
 * Merges a new observation's traits into existing learned traits.
 *
 * Uses a weighted running average:
 *   new_score = (old_score * n + new_score) / (n + 1)
 *   confidence grows by OBSERVATION_CONFIDENCE_STEP per observation, capped at 0.95
 */
export function mergeTraitObservation(
  existing: LearnedStyleTraits,
  newTraits: Partial<LearnedStyleTraits>,
  existingObservationCount: number,
): LearnedStyleTraits {
  const n = existingObservationCount;
  const merged = { ...existing };

  for (const key of Object.keys(newTraits) as Array<keyof LearnedStyleTraits>) {
    const incoming = newTraits[key];
    if (!incoming) continue;

    const current = existing[key];

    if (current.is_default) {
      // First real observation — replace default directly
      merged[key] = {
        score: incoming.score,
        confidence: incoming.confidence,
        is_default: false,
      };
    } else {
      // Weighted running average for score
      const newScore = (current.score * n + incoming.score) / (n + 1);
      // Confidence grows with each consistent observation
      const newConfidence = Math.min(0.95, current.confidence + OBSERVATION_CONFIDENCE_STEP);
      merged[key] = {
        score: newScore,
        confidence: newConfidence,
        is_default: false,
      };
    }
  }

  return merged;
}

// ─── Merge: profile style_memory + learned traits → effective style for prompt ─

/**
 * Produces the effective style text that enters the generation prompt.
 *
 * Rules:
 * 1. Profile style_memory (per-contact) is always PRIMARY if it exists.
 * 2. Learned traits (per-user, cross-contact) augment it when confidence >= HIGH_CONFIDENCE_THRESHOLD.
 * 3. Explicit profile style_memory is never overridden — learned traits are additive only.
 * 4. If profile style_memory is absent, high-confidence learned traits serve as the baseline.
 * 5. Low-confidence traits (< PROMPT_CONFIDENCE_THRESHOLD) are silently ignored.
 * 6. If no data at all → returns the standard "Not established yet." placeholder.
 */
export function mergeEffectiveStyle(
  profileStyleMemory: string | null | undefined,
  learnedStyle: UserLearnedStyle | null,
): EffectiveStyleSummary {
  const hasProfileStyle =
    typeof profileStyleMemory === "string" && profileStyleMemory.trim().length > 10;

  const hasLearnedStyle =
    learnedStyle !== null && learnedStyle.observation_count > 0;

  // Get traits that are established enough to influence the prompt
  const highConfidenceTraits = hasLearnedStyle
    ? getTraitsAboveThreshold(learnedStyle!.traits, HIGH_CONFIDENCE_THRESHOLD)
    : [];

  const promptableTraits = hasLearnedStyle
    ? getTraitsAboveThreshold(learnedStyle!.traits, PROMPT_CONFIDENCE_THRESHOLD)
    : [];

  const structuredTraits = hasLearnedStyle ? learnedStyle!.traits : null;
  const obsCount = learnedStyle?.observation_count ?? 0;

  // Case 1: profile style exists, high-confidence cross-profile traits exist → augment
  if (hasProfileStyle && highConfidenceTraits.length > 0) {
    const traitLine = describeTrait(highConfidenceTraits);
    return {
      text: `${profileStyleMemory}\n[Cross-profile style pattern: ${traitLine}]`,
      traits: structuredTraits,
      observation_count: obsCount,
      has_learned_contribution: true,
    };
  }

  // Case 2: profile style exists, no established traits yet → use profile style only
  if (hasProfileStyle) {
    return {
      text: profileStyleMemory!,
      traits: structuredTraits,
      observation_count: obsCount,
      has_learned_contribution: false,
    };
  }

  // Case 3: no profile style, but promptable learned traits exist → use as baseline
  if (promptableTraits.length > 0) {
    const traitLine = describeTrait(promptableTraits);
    return {
      text: `Style not yet profiled for this contact. Inferred cross-profile baseline: ${traitLine}.`,
      traits: structuredTraits,
      observation_count: obsCount,
      has_learned_contribution: true,
    };
  }

  // Case 4: nothing
  return {
    text: "Not established yet.",
    traits: null,
    observation_count: 0,
    has_learned_contribution: false,
  };
}

// ─── Phase 3: Behavioral trait deltas ─────────────────────────────────────────

/**
 * Known option plan labels produced by buildOptionPlans() in the generate route.
 * These are the labels the AI assigns to each of the 3 reply variants.
 */
export type OptionPlanLabel =
  | "calm_boundary"
  | "direct_control"
  | "warmer_reset"
  | "concise_authority"
  | "repair_with_action";

/**
 * A compact trait delta — positive means the user's selection suggests a higher
 * preference for that trait; negative means lower. Values are intentionally small
 * so no single session dominates the learned state.
 *
 * Typical range: -0.06 to +0.06 per event.
 * The actual score change is further scaled by signalStrength (0–1).
 */
export type TraitDelta = Partial<Record<keyof LearnedStyleTraits, number>>;

/**
 * Maps an option plan label to the trait deltas that selecting it implies.
 * These are product-grounded — each label's tone/style intent is well-defined
 * by the generation prompt. No deep psychology; no speculation.
 */
const PLAN_TRAIT_DELTAS: Record<OptionPlanLabel, TraitDelta> = {
  calm_boundary:     { boundary_strength: +0.05, politeness: +0.03, assertiveness: -0.02 },
  direct_control:    { directness: +0.06, assertiveness: +0.05, politeness: -0.02 },
  warmer_reset:      { warmth: +0.06, politeness: +0.04, directness: -0.02 },
  concise_authority: { brevity: +0.06, professionalism: +0.04 },
  repair_with_action:{ warmth: +0.04, politeness: +0.03, boundary_strength: +0.03 },
};

/**
 * Tone-name fallback deltas when no plan label is available.
 * Matches tones used in the generate route.
 */
const TONE_FALLBACK_DELTAS: Array<{ match: RegExp; delta: TraitDelta }> = [
  { match: /tactical|control|authority|precision|edge/i, delta: { assertiveness: +0.04, directness: +0.04 } },
  { match: /warm|empath|gentle|support/i,               delta: { warmth: +0.05, politeness: +0.03 } },
  { match: /concis|brief|direct/i,                      delta: { brevity: +0.04, directness: +0.03 } },
  { match: /formal|profession/i,                         delta: { professionalism: +0.05 } },
];

/**
 * Derives a TraitDelta from a user selection event.
 *
 * @param optionPlanLabel  - the plan label for the selected reply (from optionPlans[index].label)
 * @param tone             - the tone string (from the generate request body)
 * @returns a map of trait names to score nudges, ready to be applied via applyTraitDelta()
 */
export function inferTraitDeltasFromSelection(
  optionPlanLabel: string | null | undefined,
  tone: string | null | undefined,
): TraitDelta {
  if (optionPlanLabel && optionPlanLabel in PLAN_TRAIT_DELTAS) {
    return PLAN_TRAIT_DELTAS[optionPlanLabel as OptionPlanLabel];
  }
  // Fallback: match tone name against known patterns
  if (tone) {
    for (const { match, delta } of TONE_FALLBACK_DELTAS) {
      if (match.test(tone)) return delta;
    }
  }
  // No signal strong enough to infer — return empty delta (safe no-op)
  return {};
}

/**
 * Applies a behavioral delta to a learned trait set.
 *
 * Rules:
 * - Delta is scaled by signalStrength (0.0–1.0):
 *     1.0 = user favorited/saved the reply (strongest confirmation)
 *     0.8 = user copied the reply
 *     0.5 = user clicked "use this reply" without copying
 * - Score change is clamped to ±MAX_SCORE_SHIFT per application
 *   to prevent a single session from dominating.
 * - Confidence grows by a small fixed step (BEHAVIORAL_CONFIDENCE_STEP),
 *   which is smaller than the style-summary seed step (0.15),
 *   because behavioral signals are weaker than AI-observed message history.
 * - Traits that are `is_default` get a larger shift (first real signal).
 * - Score is always clamped to [0.0, 1.0].
 *
 * This function is PURE — it does not write to the database.
 * The caller (updateLearnedStyleFromBehavior in supabase.ts) handles persistence.
 */
const MAX_SCORE_SHIFT = 0.07;         // hard cap per application
const BEHAVIORAL_CONFIDENCE_STEP = 0.05; // weak confidence gain per behavioral event

export function applyTraitDelta(
  existing: LearnedStyleTraits,
  delta: TraitDelta,
  signalStrength: number, // 0.0–1.0
): LearnedStyleTraits {
  if (Object.keys(delta).length === 0) return existing;

  const strength = Math.max(0, Math.min(1, signalStrength));
  const result = { ...existing };

  for (const key of Object.keys(delta) as Array<keyof LearnedStyleTraits>) {
    const nudge = delta[key];
    if (nudge === undefined) continue;

    const current = existing[key];
    const scaledNudge = Math.max(-MAX_SCORE_SHIFT, Math.min(MAX_SCORE_SHIFT, nudge * strength));

    const newScore = Math.max(0, Math.min(1, current.score + scaledNudge));
    const newConfidence = current.is_default
      ? Math.min(0.95, BEHAVIORAL_CONFIDENCE_STEP * 2) // first real signal — slightly larger jump
      : Math.min(0.95, current.confidence + BEHAVIORAL_CONFIDENCE_STEP);

    result[key] = {
      score: newScore,
      confidence: newConfidence,
      is_default: false,
    };
  }

  return result;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

type TraitEntry = { name: keyof LearnedStyleTraits; score: number; confidence: number };

function getTraitsAboveThreshold(
  traits: LearnedStyleTraits,
  threshold: number,
): TraitEntry[] {
  return (Object.keys(traits) as Array<keyof LearnedStyleTraits>)
    .filter((k) => !traits[k].is_default && traits[k].confidence >= threshold)
    .map((k) => ({ name: k, score: traits[k].score, confidence: traits[k].confidence }))
    .sort((a, b) => b.confidence - a.confidence);
}

const TRAIT_LABELS: Record<keyof LearnedStyleTraits, { high: string; low: string }> = {
  directness:        { high: "direct and to-the-point",    low: "indirect, softer phrasing" },
  warmth:            { high: "warm and personable",         low: "cool and detached" },
  brevity:           { high: "concise, few words",          low: "longer, more detailed" },
  assertiveness:     { high: "assertive and confident",     low: "passive or deferential" },
  politeness:        { high: "polite, considerate phrasing",low: "blunt, minimal pleasantries" },
  boundary_strength: { high: "sets clear limits explicitly",low: "rarely states limits directly" },
  professionalism:   { high: "formal register",             low: "casual, informal" },
  humor:             { high: "light or playful at times",   low: "consistently serious" },
};

function describeTrait(entries: TraitEntry[]): string {
  const labels = entries
    .filter((e) => e.score < 0.4 || e.score > 0.6) // only describe non-neutral traits
    .map((e) => {
      const label = e.score >= 0.6 ? TRAIT_LABELS[e.name].high : TRAIT_LABELS[e.name].low;
      return label;
    });

  return labels.length > 0 ? labels.join(", ") : "no strong patterns established yet";
}
