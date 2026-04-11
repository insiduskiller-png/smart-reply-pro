import "./load-env";
import { generateReply } from "../lib/openai";
import { buildEvaluationDataset } from "./generator";
import {
  blendJudgeFeedback,
  createHeuristicFeedback,
  judgeWithModel,
  scoreJudgeFeedback,
} from "./judge";
import { writeReportFiles } from "./report";
import type {
  CategoryAggregate,
  EvalTone,
  EvalVariant,
  EvaluationCase,
  EvaluationReport,
  EvaluationResult,
  FailureAggregate,
  GeneratedOption,
  OptionEvaluation,
  RunConfig,
} from "./types";

type CliOptions = {
  targetCaseCount: number;
  repeats: number;
  optionsPerCase: number;
  maxConcurrency: number;
  seed: number;
  ids?: Set<string>;
  out?: string;
  judgeWithLlm: boolean;
  judgeModel: string;
  judgeTemperature: number;
  strategyVersion: string;
};

const OPTION_VARIANTS: EvalVariant[] = ["Calm", "Assertive", "Strategic", "Pro Optimized"];
const FALLBACK_TONES: EvalTone[] = [
  "Neutral",
  "Direct",
  "Polite",
  "Friendly",
  "Tactical Control",
  "Precision Authority",
  "Psychological Edge",
];

type TacticalOptionProfile = {
  key: "calm_boundary" | "direct_control" | "warmer_reset" | "concise_authority" | "repair_with_action";
  tone: EvalTone;
  variant: EvalVariant;
  directive: string;
  openingStyle: string;
};

function parseCliArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    targetCaseCount: 250,
    repeats: 1,
    optionsPerCase: 3,
    maxConcurrency: 5,
    seed: 20260406,
    judgeWithLlm: true,
    judgeModel: "gpt-4o-mini",
    judgeTemperature: 0,
    strategyVersion: "current",
  };

  for (const arg of args) {
    if (arg.startsWith("--target=")) {
      const value = Number(arg.slice("--target=".length));
      if (Number.isFinite(value) && value > 0) options.targetCaseCount = Math.floor(value);
    } else if (arg.startsWith("--repeats=")) {
      const value = Number(arg.slice("--repeats=".length));
      if (Number.isFinite(value) && value > 0) options.repeats = Math.floor(value);
    } else if (arg.startsWith("--options=")) {
      const value = Number(arg.slice("--options=".length));
      if (Number.isFinite(value) && value > 0) options.optionsPerCase = Math.floor(value);
    } else if (arg.startsWith("--concurrency=")) {
      const value = Number(arg.slice("--concurrency=".length));
      if (Number.isFinite(value) && value > 0) options.maxConcurrency = Math.floor(value);
    } else if (arg.startsWith("--seed=")) {
      const value = Number(arg.slice("--seed=".length));
      if (Number.isFinite(value)) options.seed = Math.floor(value);
    } else if (arg.startsWith("--ids=")) {
      const ids = arg
        .slice("--ids=".length)
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (ids.length) options.ids = new Set(ids);
    } else if (arg.startsWith("--out=")) {
      const out = arg.slice("--out=".length).trim();
      if (out) options.out = out;
    } else if (arg.startsWith("--judge-model=")) {
      const model = arg.slice("--judge-model=".length).trim();
      if (model) options.judgeModel = model;
    } else if (arg.startsWith("--judge-temp=")) {
      const value = Number(arg.slice("--judge-temp=".length));
      if (Number.isFinite(value)) options.judgeTemperature = value;
    } else if (arg.startsWith("--strategy-version=")) {
      const version = arg.slice("--strategy-version=".length).trim();
      if (version) options.strategyVersion = version;
    } else if (arg === "--no-llm-judge") {
      options.judgeWithLlm = false;
    }
  }

  return options;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pickOptionTone(evalCase: EvaluationCase, index: number): EvalTone {
  if (index === 0 && evalCase.preferredTone) {
    return evalCase.preferredTone;
  }
  return FALLBACK_TONES[index % FALLBACK_TONES.length] ?? "Neutral";
}

function pickOptionVariant(index: number): EvalVariant {
  return OPTION_VARIANTS[index % OPTION_VARIANTS.length] ?? "Assertive";
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

function findTooSimilarOptionIndexes(replies: string[], threshold = 0.72) {
  const indexes = new Set<number>();
  for (let i = 0; i < replies.length; i += 1) {
    for (let j = i + 1; j < replies.length; j += 1) {
      if (jaccardSimilarity(replies[i], replies[j]) >= threshold) {
        indexes.add(j);
      }
    }
  }
  return [...indexes];
}

function buildTacticalProfiles(evalCase: EvaluationCase): TacticalOptionProfile[] {
  const isProfessionalContext =
    evalCase.variation.relationshipContext === "work" ||
    evalCase.variation.relationshipContext === "client" ||
    evalCase.domain === "work_professional_pressure" ||
    evalCase.domain === "status_power_dynamics";

  if (isProfessionalContext) {
    return [
      {
        key: "concise_authority",
        tone: "Precision Authority",
        variant: "Strategic",
        openingStyle: "Open with ownership and action.",
        directive: "Use concise authority: one timeline, one next step, no defensive explanation.",
      },
      {
        key: "direct_control",
        tone: "Tactical Control",
        variant: "Assertive",
        openingStyle: "Open with clear control line.",
        directive: "Use direct control: set frame and pace. Calm command language, no polished manager-speak.",
      },
      {
        key: "repair_with_action",
        tone: "Direct",
        variant: "Calm",
        openingStyle: "Open with brief accountability line.",
        directive: "Use repair with action: acknowledge once, then immediate concrete fix with timing.",
      },
    ];
  }

  return [
    {
      key: "calm_boundary",
      tone: evalCase.preferredTone ?? "Neutral",
      variant: "Calm",
      openingStyle: "Open with calm boundary line.",
      directive: "Use calm boundary: clear limit, low emotion, minimal explanation.",
    },
    {
      key: "direct_control",
      tone: "Tactical Control",
      variant: "Assertive",
      openingStyle: "Open with directional line.",
      directive: "Use direct control: reframe toward what happens next. Keep leverage.",
    },
    {
      key: "warmer_reset",
      tone: "Friendly",
      variant: "Strategic",
      openingStyle: "Open with warm reset line.",
      directive: "Use warmer reset: lower tension without surrendering boundary.",
    },
  ];
}

async function mapWithConcurrency<TInput, TOutput>(
  items: TInput[],
  limit: number,
  mapper: (item: TInput, index: number) => Promise<TOutput>,
) {
  const output: TOutput[] = new Array(items.length);
  let pointer = 0;

  async function worker() {
    while (pointer < items.length) {
      const index = pointer;
      pointer += 1;
      output[index] = await mapper(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.max(1, limit) }, () => worker());
  await Promise.all(workers);
  return output;
}

async function generateOptions(evalCase: EvaluationCase, optionCount: number): Promise<GeneratedOption[]> {
  const tasks = Array.from({ length: optionCount }, (_, index) => index);
  const tacticalProfiles = buildTacticalProfiles(evalCase);

  let options = await mapWithConcurrency(tasks, Math.min(3, optionCount), async (index) => {
    const profile = tacticalProfiles[index % tacticalProfiles.length];
    const tone = profile?.tone ?? pickOptionTone(evalCase, index);
    const variant = profile?.variant ?? pickOptionVariant(index);

    const reply = await generateReply({
      input: evalCase.inputMessage,
      context: evalCase.contextNotes,
      tone,
      variant,
      template: evalCase.template,
      modifier: [
        `Desired strategic direction: ${evalCase.desiredStrategicDirection}`,
        `Failure patterns to avoid: ${evalCase.failurePatternsToAvoid.join(", ")}`,
        `Expected strengths: ${evalCase.expectedStrengths.join(", ")}`,
        `Option role: ${profile?.key ?? `option_${index + 1}`}`,
        `Tactical directive: ${profile?.directive ?? "Use a distinct tactical move."}`,
        `Opening style: ${profile?.openingStyle ?? "Use a distinct opening style."}`,
        "This option must be tactically distinct from sibling options (different opening, structure, and move).",
        `Avoid overlap with sibling options. Option index: ${index + 1}/${optionCount}.`,
      ].join("\n"),
      profileContext: {
        contactName: "ScenarioSender",
        relationshipType: evalCase.variation.relationshipContext,
        contextNotes: evalCase.contextNotes,
        styleSummary:
          "Natural text style. Concise. Calm authority. Minimal filler. Avoids formal assistant phrasing.",
        profileSummary: "Responds best to direct, emotionally intelligent language with clear boundaries.",
      },
    });

    return {
      optionId: `${evalCase.id}__o${index + 1}`,
      tone,
      variant,
      reply,
    };
  });

  const tooSimilarIndexes = findTooSimilarOptionIndexes(options.map((item) => item.reply));
  if (tooSimilarIndexes.length > 0) {
    const rewritten = await Promise.all(
      tooSimilarIndexes.map((index) => {
        const current = options[index];
        const siblingText = options
          .filter((_, idx) => idx !== index)
          .map((item) => `${item.optionId}: ${item.reply}`)
          .join("\n");

        return generateReply({
          input: evalCase.inputMessage,
          context: evalCase.contextNotes,
          tone: current.tone,
          variant: current.variant,
          template: evalCase.template,
          modifier: [
            `Option role rewrite: ${current.optionId}`,
            "DIVERGENCE PASS: this option was too similar to siblings.",
            "Rewrite to a different tactic with a distinct opening line, framing, and pacing.",
            siblingText,
          ].join("\n"),
          profileContext: {
            contactName: "ScenarioSender",
            relationshipType: evalCase.variation.relationshipContext,
            contextNotes: evalCase.contextNotes,
            styleSummary:
              "Natural text style. Concise. Calm authority. Minimal filler. Avoids formal assistant phrasing.",
            profileSummary: "Responds best to direct, emotionally intelligent language with clear boundaries.",
          },
        });
      }),
    );

    tooSimilarIndexes.forEach((index, rewrittenIndex) => {
      options[index] = {
        ...options[index],
        reply: rewritten[rewrittenIndex],
      };
    });
  }

  return options;
}

async function evaluateOption(params: {
  evalCase: EvaluationCase;
  option: GeneratedOption;
  allOptions: GeneratedOption[];
  cli: CliOptions;
}): Promise<OptionEvaluation> {
  const startedAt = Date.now();

  try {
    const allReplies = params.allOptions.map((item) => item.reply);
    const heuristic = createHeuristicFeedback({
      evalCase: params.evalCase,
      optionReply: params.option.reply,
      allReplies,
    });

    const llmJudge = params.cli.judgeWithLlm
      ? await judgeWithModel({
        evalCase: params.evalCase,
        option: params.option,
        allOptions: params.allOptions,
        judgeModel: params.cli.judgeModel,
        judgeTemperature: params.cli.judgeTemperature,
      })
      : undefined;

    const final = blendJudgeFeedback(heuristic, llmJudge);

    return {
      option: params.option,
      heuristic,
      llmJudge,
      final,
      finalScore: scoreJudgeFeedback(final),
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      option: params.option,
      heuristic: createHeuristicFeedback({
        evalCase: params.evalCase,
        optionReply: params.option.reply,
        allReplies: params.allOptions.map((item) => item.reply),
      }),
      final: {
        pass: false,
        scores: {
          strategicAccuracy: 1,
          toneControl: 1,
          leveragePreservation: 1,
          humanRealism: 1,
          sendability: 1,
          brevityDiscipline: 1,
          contextFit: 1,
          optionDifferentiation: 1,
        },
        rationale: "Evaluation failed due to runtime error.",
        weaknesses: ["Evaluation runtime failure"],
        revisionDirection: "Retry run and inspect model/judge response handling.",
        hardFailures: [],
      },
      finalScore: 1,
      durationMs: Date.now() - startedAt,
      errors: [error instanceof Error ? error.message : "Unknown option evaluation error"],
    };
  }
}

async function evaluateCase(evalCase: EvaluationCase, cli: CliOptions): Promise<EvaluationResult> {
  const options = await generateOptions(evalCase, cli.optionsPerCase);

  const optionEvaluations = await mapWithConcurrency(
    options,
    Math.min(cli.maxConcurrency, cli.optionsPerCase),
    async (option) => evaluateOption({ evalCase, option, allOptions: options, cli }),
  );

  const scores = optionEvaluations.map((item) => item.finalScore);
  const failedOptions = optionEvaluations.filter((item) => !item.final.pass).length;
  const top = optionEvaluations.reduce<OptionEvaluation | undefined>((best, current) => {
    if (!best || current.finalScore > best.finalScore) {
      return current;
    }
    return best;
  }, undefined);

  return {
    caseId: evalCase.id,
    baseId: evalCase.baseId,
    domain: evalCase.domain,
    contextLabel: evalCase.contextLabel,
    pressureLabel: evalCase.pressureLabel,
    intentLabel: evalCase.intentLabel,
    powerDynamicLabel: evalCase.powerDynamicLabel,
    options: optionEvaluations,
    averageOptionScore: Math.round(average(scores) * 10) / 10,
    topOptionId: top?.option.optionId,
    failedOptions,
  };
}

function aggregateBy(items: EvaluationResult[], keyOf: (item: EvaluationResult) => string): CategoryAggregate[] {
  const grouped = new Map<string, EvaluationResult[]>();
  for (const item of items) {
    const key = keyOf(item);
    const list = grouped.get(key) ?? [];
    list.push(item);
    grouped.set(key, list);
  }

  return [...grouped.entries()].map(([key, group]) => {
    const optionRows = group.flatMap((result) => result.options);
    const avg = average(optionRows.map((row) => row.finalScore));
    const passCount = optionRows.filter((row) => row.final.pass).length;
    return {
      key,
      averageScore: Math.round(avg * 10) / 10,
      passRate: optionRows.length ? Math.round((passCount / optionRows.length) * 1000) / 10 : 0,
      sampleCount: optionRows.length,
    };
  });
}

function aggregateFailures(results: EvaluationResult[]): FailureAggregate[] {
  const counter = new Map<string, number>();
  for (const result of results) {
    for (const option of result.options) {
      for (const failure of option.final.hardFailures) {
        counter.set(failure.code, (counter.get(failure.code) ?? 0) + 1);
      }
    }
  }
  return [...counter.entries()]
    .map(([code, count]) => ({ code: code as FailureAggregate["code"], count }))
    .sort((a, b) => b.count - a.count);
}

function topWeakStrong(groups: CategoryAggregate[]) {
  const sorted = [...groups].sort((a, b) => a.averageScore - b.averageScore);
  return {
    weakest: sorted.slice(0, 5),
    strongest: [...sorted].reverse().slice(0, 5),
  };
}

async function main() {
  const cli = parseCliArgs(process.argv.slice(2));
  const dataset = buildEvaluationDataset({
    targetCaseCount: cli.targetCaseCount,
    repeats: cli.repeats,
    seed: cli.seed,
    idsFilter: cli.ids,
  });

  if (!dataset.length) {
    throw new Error("No evaluation cases were generated. Check filters and target size.");
  }

  const runConfig: RunConfig = {
    targetCaseCount: cli.targetCaseCount,
    optionsPerCase: cli.optionsPerCase,
    repeats: cli.repeats,
    maxConcurrency: cli.maxConcurrency,
    seed: cli.seed,
    useLlmJudge: cli.judgeWithLlm,
    outputName: cli.out,
    judgeModel: cli.judgeModel,
    judgeTemperature: cli.judgeTemperature,
    strategyVersion: cli.strategyVersion,
  };

  console.log(
    `Running Smart Reply Pro evaluation: ${dataset.length} case(s), ${cli.optionsPerCase} option(s)/case, concurrency=${cli.maxConcurrency}`,
  );

  const startedAt = Date.now();
  const results = await mapWithConcurrency(dataset, cli.maxConcurrency, async (evalCase, index) => {
    if ((index + 1) % 25 === 0 || index === 0) {
      console.log(`Processed ${index + 1}/${dataset.length} cases...`);
    }
    return evaluateCase(evalCase, cli);
  });

  const options = results.flatMap((result) => result.options);
  const scores = options.map((item) => item.finalScore);
  const durations = options.map((item) => item.durationMs);
  const passRate = options.length
    ? Math.round((options.filter((item) => item.final.pass).length / options.length) * 1000) / 10
    : 0;

  const byDomain = aggregateBy(results, (item) => item.domain);
  const byPressure = aggregateBy(results, (item) => item.pressureLabel);
  const byIntent = aggregateBy(results, (item) => item.intentLabel);
  const messageType = aggregateBy(results, (item) => `${item.domain}:${item.contextLabel}`);
  const weakStrong = topWeakStrong(messageType);

  const report: EvaluationReport = {
    runConfig,
    summary: {
      totalCases: results.length,
      totalOptions: options.length,
      averageScore: Math.round(average(scores) * 10) / 10,
      passRate,
      generatedAt: new Date().toISOString(),
      averageDurationMs: Math.round(average(durations)),
      byDomain,
      byPressure,
      byIntent,
      weakestMessageTypes: weakStrong.weakest,
      strongestMessageTypes: weakStrong.strongest,
      commonFailures: aggregateFailures(results),
    },
    results,
  };

  const paths = await writeReportFiles(report, cli.out);

  console.log("\nEvaluation complete.");
  console.log(`Cases: ${report.summary.totalCases}`);
  console.log(`Options: ${report.summary.totalOptions}`);
  console.log(`Average score: ${report.summary.averageScore}/10`);
  console.log(`Pass rate: ${report.summary.passRate}%`);
  console.log(`Elapsed: ${Math.round((Date.now() - startedAt) / 1000)}s`);
  console.log(`JSON report: ${paths.jsonPath}`);
  console.log(`Markdown report: ${paths.mdPath}`);
}

void main().catch((error) => {
  console.error("Evaluation failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
