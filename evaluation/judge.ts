import { getOpenAiEnv } from "../lib/env";
import { SMART_REPLY_JUDGE_SYSTEM_PROMPT } from "./judge-prompt";
import type {
  CriterionScore,
  EvalDomain,
  EvaluationCase,
  GeneratedOption,
  HardFailure,
  HardFailureCode,
  JudgeFeedback,
} from "./types";

const DEFAULT_SCORE = 7;

const hardFailureMatchers: Array<{
  code: HardFailureCode;
  severity: "warning" | "critical";
  patterns: RegExp[];
  message: string;
}> = [
  {
    code: "overexplain",
    severity: "warning",
    patterns: [/\b(let me explain|to clarify everything|for full transparency)\b/i],
    message: "Reply over-explains rather than moving strategically.",
  },
  {
    code: "robotic",
    severity: "critical",
    patterns: [/\b(i understand your concern|thank you for your patience|i would be happy to)\b/i],
    message: "Reply sounds robotic or templated.",
  },
  {
    code: "unnecessary_apology",
    severity: "warning",
    patterns: [/\b(i'?m so sorry|i deeply apologize|my sincerest apologies)\b/i],
    message: "Reply apologizes excessively or unnecessarily.",
  },
  {
    code: "needy",
    severity: "critical",
    patterns: [/\b(please don't be mad|i just need you to|i hope you still like me)\b/i],
    message: "Reply sounds needy and weakens leverage.",
  },
  {
    code: "emotionally_reactive",
    severity: "critical",
    patterns: [/\b(relax\.?|whatever\.?|you always|this is ridiculous)\b/i],
    message: "Reply is emotionally reactive.",
  },
  {
    code: "therapy_bot_language",
    severity: "warning",
    patterns: [/\b(holding space|validating your feelings|your nervous system)\b/i],
    message: "Reply uses generic therapy-bot language.",
  },
  {
    code: "corporate_in_casual_context",
    severity: "warning",
    patterns: [
      /\b(align on this|alignment|aligned|moving forward|actionable next steps)\b/i,
      /\b(on the same page|collaboration|constructive solutions|clear communication)\b/i,
      /\b(let'?s keep this constructive|address concerns directly|ensure we'?re aligned)\b/i,
      /\b(thank you for your patience|i appreciate your urgency|ensure it meets expectations)\b/i,
      /\b(support our work together|manager-speak|stakeholder language)\b/i,
      /\b(expectations moving forward)\b/i,
    ],
    message: "Reply uses corporate language in personal/casual context.",
  },
];

function clampScore(value: number) {
  return Math.max(1, Math.min(10, Math.round(value * 10) / 10));
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function sentenceCount(text: string) {
  return text.split(/[.!?]+/).map((x) => x.trim()).filter(Boolean).length;
}

function tokenSet(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );
}

function jaccardSimilarity(a: string, b: string) {
  const first = tokenSet(a);
  const second = tokenSet(b);
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

export function computeOptionDifferentiationScore(optionReply: string, allReplies: string[]) {
  const otherReplies = allReplies.filter((reply) => reply !== optionReply);
  if (!otherReplies.length) {
    return 10;
  }

  const avgSimilarity = average(otherReplies.map((reply) => jaccardSimilarity(optionReply, reply)));
  return clampScore(10 - avgSimilarity * 10);
}

function hardFailureFromOptionSimilarity(optionReply: string, allReplies: string[]): HardFailure[] {
  const similarities = allReplies
    .filter((reply) => reply !== optionReply)
    .map((reply) => jaccardSimilarity(optionReply, reply));

  const maxSimilarity = similarities.length ? Math.max(...similarities) : 0;
  if (maxSimilarity >= 0.78) {
    return [
      {
        code: "option_similarity",
        severity: "critical",
        message: "Generated options are too similar and not meaningfully differentiated.",
      },
    ];
  }

  return [];
}

function detectPatternFailures(reply: string): HardFailure[] {
  return hardFailureMatchers
    .filter((item) => item.patterns.some((pattern) => pattern.test(reply)))
    .map((item) => ({ code: item.code, severity: item.severity, message: item.message }));
}

function domainContextPenalty(domain: EvalDomain, reply: string): number {
  const lower = reply.toLowerCase();

  if (
    (domain === "dating_mixed_signals" || domain === "family_personal_conflict") &&
    /\b(actionable next steps|alignment|aligned|stakeholder|moving forward|on the same page|collaboration|clear communication)\b/i.test(lower)
  ) {
    return 2;
  }

  return 0;
}

function scoreHeuristicCriteria(params: {
  evalCase: EvaluationCase;
  optionReply: string;
  allReplies: string[];
  failures: HardFailure[];
}): CriterionScore {
  const words = wordCount(params.optionReply);
  const sentences = sentenceCount(params.optionReply);
  const hardFailureCount = params.failures.length;
  const criticalCount = params.failures.filter((item) => item.severity === "critical").length;
  const differentiation = computeOptionDifferentiationScore(params.optionReply, params.allReplies);
  const contextPenalty = domainContextPenalty(params.evalCase.domain, params.optionReply);

  const brevityBase = words >= 18 && words <= 90 ? 9 : words <= 120 ? 7 : 4;
  const toneBase = /\b(whatever|calm down|relax|you always)\b/i.test(params.optionReply) ? 3 : 8;

  return {
    strategicAccuracy: clampScore(DEFAULT_SCORE + (criticalCount ? -2 : 1) - contextPenalty),
    toneControl: clampScore(toneBase - criticalCount),
    leveragePreservation: clampScore(8 - criticalCount - (hardFailureCount > 2 ? 1 : 0)),
    humanRealism: clampScore(8 - (hardFailureCount > 0 ? 1 : 0)),
    sendability: clampScore(8 - criticalCount - (words > 130 ? 2 : 0)),
    brevityDiscipline: clampScore(brevityBase - (sentences > 5 ? 2 : 0)),
    contextFit: clampScore(8 - contextPenalty - (hardFailureCount > 1 ? 1 : 0)),
    optionDifferentiation: differentiation,
  };
}

function scoreFromCriteria(scores: CriterionScore) {
  const values = Object.values(scores);
  return clampScore(average(values));
}

function mergeFailures(primary: HardFailure[], secondary: HardFailure[]) {
  const map = new Map<string, HardFailure>();
  for (const item of [...primary, ...secondary]) {
    if (!map.has(item.code)) {
      map.set(item.code, item);
    }
  }
  return [...map.values()];
}

export function createHeuristicFeedback(params: {
  evalCase: EvaluationCase;
  optionReply: string;
  allReplies: string[];
}): JudgeFeedback {
  const patternFailures = detectPatternFailures(params.optionReply);
  const similarityFailures = hardFailureFromOptionSimilarity(params.optionReply, params.allReplies);
  const hardFailures = mergeFailures(patternFailures, similarityFailures);
  const scores = scoreHeuristicCriteria({
    evalCase: params.evalCase,
    optionReply: params.optionReply,
    allReplies: params.allReplies,
    failures: hardFailures,
  });

  const weaknesses = hardFailures.map((failure) => failure.message);
  const finalScore = scoreFromCriteria(scores);

  return {
    pass: finalScore >= 7 && hardFailures.filter((item) => item.severity === "critical").length === 0,
    scores,
    rationale:
      finalScore >= 7
        ? "Strategically usable with controlled tone and acceptable realism."
        : "Reply has strategic or tonal issues that reduce sendability.",
    weaknesses,
    revisionDirection:
      weaknesses.length > 0
        ? "Tighten to 2-4 sentences, remove reactive language, and restate a clear boundary or next step."
        : "Keep this structure and sharpen one line for stronger leverage.",
    hardFailures,
  };
}

function toJudgeFeedback(payload: unknown): JudgeFeedback | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const raw = payload as Record<string, unknown>;
  const rawScores = raw.scores as Record<string, unknown> | undefined;
  if (!rawScores) {
    return undefined;
  }

  const scores: CriterionScore = {
    strategicAccuracy: clampScore(Number(rawScores.strategicAccuracy ?? 0) || DEFAULT_SCORE),
    toneControl: clampScore(Number(rawScores.toneControl ?? 0) || DEFAULT_SCORE),
    leveragePreservation: clampScore(Number(rawScores.leveragePreservation ?? 0) || DEFAULT_SCORE),
    humanRealism: clampScore(Number(rawScores.humanRealism ?? 0) || DEFAULT_SCORE),
    sendability: clampScore(Number(rawScores.sendability ?? 0) || DEFAULT_SCORE),
    brevityDiscipline: clampScore(Number(rawScores.brevityDiscipline ?? 0) || DEFAULT_SCORE),
    contextFit: clampScore(Number(rawScores.contextFit ?? 0) || DEFAULT_SCORE),
    optionDifferentiation: clampScore(Number(rawScores.optionDifferentiation ?? 0) || DEFAULT_SCORE),
  };

  const hardFailures: HardFailure[] = Array.isArray(raw.hardFailures)
    ? raw.hardFailures
      .map((item) => {
        if (!item || typeof item !== "object") {
          return undefined;
        }
        const record = item as Record<string, unknown>;
        const code = String(record.code ?? "") as HardFailureCode;
        const severity = record.severity === "critical" ? "critical" : "warning";
        const message = String(record.message ?? "").trim();
        if (!code || !message) {
          return undefined;
        }
        return { code, severity, message } as HardFailure;
      })
      .filter((item): item is HardFailure => Boolean(item))
    : [];

  return {
    pass: Boolean(raw.pass),
    scores,
    rationale: String(raw.rationale ?? "").trim() || "No rationale provided.",
    weaknesses: Array.isArray(raw.weaknesses)
      ? raw.weaknesses.map((item) => String(item)).filter(Boolean)
      : [],
    revisionDirection: String(raw.revisionDirection ?? "").trim() || "Improve strategic clarity and tone control.",
    hardFailures,
  };
}

async function callJudgeModel(params: {
  judgeModel: string;
  judgeTemperature: number;
  userPrompt: string;
}) {
  const { openAiApiKey } = getOpenAiEnv();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.judgeModel,
      temperature: params.judgeTemperature,
      messages: [
        { role: "system", content: SMART_REPLY_JUDGE_SYSTEM_PROMPT },
        { role: "user", content: params.userPrompt },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new Error(`Judge model request failed: ${payload || response.statusText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content ?? "";
}

export async function judgeWithModel(params: {
  evalCase: EvaluationCase;
  option: GeneratedOption;
  allOptions: GeneratedOption[];
  judgeModel: string;
  judgeTemperature: number;
}) {
  const allOptionText = params.allOptions
    .map((item) => `${item.optionId} (${item.tone}/${item.variant}): ${item.reply}`)
    .join("\n\n");

  const prompt = [
    `Case ID: ${params.evalCase.id}`,
    `Domain: ${params.evalCase.domain}`,
    `Context label: ${params.evalCase.contextLabel}`,
    `Input message: ${params.evalCase.inputMessage}`,
    `Tone label: ${params.evalCase.toneLabel}`,
    `Pressure label: ${params.evalCase.pressureLabel}`,
    `Intent label: ${params.evalCase.intentLabel}`,
    `Power dynamic label: ${params.evalCase.powerDynamicLabel}`,
    `Desired strategic direction: ${params.evalCase.desiredStrategicDirection}`,
    `Failure patterns to avoid: ${params.evalCase.failurePatternsToAvoid.join(", ")}`,
    `Expected strengths: ${params.evalCase.expectedStrengths.join(", ")}`,
    "",
    "All generated options:",
    allOptionText,
    "",
    `Target option to score: ${params.option.optionId}`,
  ].join("\n");

  const raw = await callJudgeModel({
    judgeModel: params.judgeModel,
    judgeTemperature: params.judgeTemperature,
    userPrompt: prompt,
  });

  const parsed = toJudgeFeedback(JSON.parse(raw) as unknown);
  if (!parsed) {
    throw new Error("Judge response could not be parsed into structured scores.");
  }

  return parsed;
}

export function blendJudgeFeedback(heuristic: JudgeFeedback, llmJudge?: JudgeFeedback): JudgeFeedback {
  if (!llmJudge) {
    return heuristic;
  }

  const mergedScores: CriterionScore = {
    strategicAccuracy: clampScore(heuristic.scores.strategicAccuracy * 0.4 + llmJudge.scores.strategicAccuracy * 0.6),
    toneControl: clampScore(heuristic.scores.toneControl * 0.4 + llmJudge.scores.toneControl * 0.6),
    leveragePreservation: clampScore(
      heuristic.scores.leveragePreservation * 0.4 + llmJudge.scores.leveragePreservation * 0.6,
    ),
    humanRealism: clampScore(heuristic.scores.humanRealism * 0.4 + llmJudge.scores.humanRealism * 0.6),
    sendability: clampScore(heuristic.scores.sendability * 0.4 + llmJudge.scores.sendability * 0.6),
    brevityDiscipline: clampScore(heuristic.scores.brevityDiscipline * 0.4 + llmJudge.scores.brevityDiscipline * 0.6),
    contextFit: clampScore(heuristic.scores.contextFit * 0.4 + llmJudge.scores.contextFit * 0.6),
    optionDifferentiation: clampScore(
      heuristic.scores.optionDifferentiation * 0.5 + llmJudge.scores.optionDifferentiation * 0.5,
    ),
  };

  const mergedHardFailures = mergeFailures(heuristic.hardFailures, llmJudge.hardFailures);
  const hasCritical = mergedHardFailures.some((item) => item.severity === "critical");

  return {
    pass: !hasCritical && scoreFromCriteria(mergedScores) >= 7,
    scores: mergedScores,
    rationale: llmJudge.rationale || heuristic.rationale,
    weaknesses: Array.from(new Set([...heuristic.weaknesses, ...llmJudge.weaknesses])),
    revisionDirection: llmJudge.revisionDirection || heuristic.revisionDirection,
    hardFailures: mergedHardFailures,
  };
}

export function scoreJudgeFeedback(feedback: JudgeFeedback) {
  return scoreFromCriteria(feedback.scores);
}
