export type EvalDomain =
  | "dating_mixed_signals"
  | "work_professional_pressure"
  | "manipulative_messages"
  | "family_personal_conflict"
  | "status_power_dynamics"
  | "disrespect_passive_aggression"
  | "guilt_tripping"
  | "ambiguity_plausible_deniability"
  | "urgency_pressure"
  | "apology_repair";

export type EvalTemplate = "work" | "dating" | "negotiation" | "conflict" | "decline" | "customer_service";

export type EvalTone =
  | "Neutral"
  | "Direct"
  | "Polite"
  | "Friendly"
  | "Tactical Control"
  | "Precision Authority"
  | "Psychological Edge";

export type EvalVariant = "Calm" | "Assertive" | "Strategic" | "Pro Optimized";

export type PressureLabel = "low" | "medium" | "high" | "extreme";
export type IntentLabel = "repair" | "control" | "extract" | "test" | "clarify" | "escalate" | "de-escalate";
export type PowerDynamicLabel = "sender_advantaged" | "receiver_advantaged" | "balanced" | "unclear";

export type BaseScenarioCase = {
  id: string;
  domain: EvalDomain;
  contextLabel: string;
  message: string;
  toneLabel: string;
  pressureLabel: PressureLabel;
  intentLabel: IntentLabel;
  powerDynamicLabel: PowerDynamicLabel;
  desiredStrategicDirection: string;
  failurePatternsToAvoid: string[];
  expectedStrengths: string[];
  template?: EvalTemplate;
  preferredTone?: EvalTone;
  relationshipContext: string;
};

export type ScenarioVariation = {
  senderTone: "soft" | "neutral" | "sharp";
  messageLength: "short" | "medium" | "long";
  politenessLevel: "low" | "medium" | "high";
  manipulationStyle: "explicit" | "subtle" | "none";
  urgencyLevel: "low" | "medium" | "high";
  authorityLevel: "peer" | "manager" | "executive" | "family_senior" | "romantic_partner";
  relationshipContext: "dating" | "work" | "family" | "friend" | "client";
  emotionalVolatility: "stable" | "strained" | "volatile";
  ambiguity: "low" | "medium" | "high";
};

export type EvaluationCase = {
  id: string;
  baseId: string;
  runSeed: number;
  domain: EvalDomain;
  contextLabel: string;
  toneLabel: string;
  pressureLabel: PressureLabel;
  intentLabel: IntentLabel;
  powerDynamicLabel: PowerDynamicLabel;
  desiredStrategicDirection: string;
  failurePatternsToAvoid: string[];
  expectedStrengths: string[];
  inputMessage: string;
  contextNotes: string;
  variation: ScenarioVariation;
  template?: EvalTemplate;
  preferredTone?: EvalTone;
};

export type GeneratedOption = {
  optionId: string;
  tone: EvalTone;
  variant: EvalVariant;
  reply: string;
};

export type CriterionScore = {
  strategicAccuracy: number;
  toneControl: number;
  leveragePreservation: number;
  humanRealism: number;
  sendability: number;
  brevityDiscipline: number;
  contextFit: number;
  optionDifferentiation: number;
};

export type HardFailureCode =
  | "overexplain"
  | "robotic"
  | "unnecessary_apology"
  | "rewards_bad_behavior"
  | "needy"
  | "emotionally_reactive"
  | "therapy_bot_language"
  | "corporate_in_casual_context"
  | "mirrors_manipulative_frame"
  | "option_similarity";

export type HardFailure = {
  code: HardFailureCode;
  message: string;
  severity: "warning" | "critical";
};

export type JudgeFeedback = {
  pass: boolean;
  scores: CriterionScore;
  rationale: string;
  weaknesses: string[];
  revisionDirection: string;
  hardFailures: HardFailure[];
};

export type OptionEvaluation = {
  option: GeneratedOption;
  heuristic: JudgeFeedback;
  llmJudge?: JudgeFeedback;
  final: JudgeFeedback;
  finalScore: number;
  durationMs: number;
  errors?: string[];
};

export type EvaluationResult = {
  caseId: string;
  baseId: string;
  domain: EvalDomain;
  contextLabel: string;
  pressureLabel: PressureLabel;
  intentLabel: IntentLabel;
  powerDynamicLabel: PowerDynamicLabel;
  options: OptionEvaluation[];
  averageOptionScore: number;
  topOptionId?: string;
  failedOptions: number;
};

export type CategoryAggregate = {
  key: string;
  averageScore: number;
  passRate: number;
  sampleCount: number;
};

export type FailureAggregate = {
  code: HardFailureCode;
  count: number;
};

export type EvaluationSummary = {
  totalCases: number;
  totalOptions: number;
  averageScore: number;
  passRate: number;
  generatedAt: string;
  averageDurationMs: number;
  byDomain: CategoryAggregate[];
  byPressure: CategoryAggregate[];
  byIntent: CategoryAggregate[];
  weakestMessageTypes: CategoryAggregate[];
  strongestMessageTypes: CategoryAggregate[];
  commonFailures: FailureAggregate[];
};

export type RunConfig = {
  targetCaseCount: number;
  optionsPerCase: number;
  repeats: number;
  maxConcurrency: number;
  seed: number;
  useLlmJudge: boolean;
  outputName?: string;
  judgeModel: string;
  judgeTemperature: number;
  strategyVersion: string;
};

export type RegressionDelta = {
  baselineReport: string;
  candidateReport: string;
  averageScoreDelta: number;
  passRateDelta: number;
  byDomainDelta: Array<{ key: string; delta: number }>;
};

export type EvaluationReport = {
  runConfig: RunConfig;
  summary: EvaluationSummary;
  results: EvaluationResult[];
  regression?: RegressionDelta;
};
