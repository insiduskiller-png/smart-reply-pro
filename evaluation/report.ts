import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EvaluationReport } from "./types";

function formatScore(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function toMarkdown(report: EvaluationReport): string {
  const { runConfig, summary, results } = report;

  const aggregateTable = (title: string, rows: Array<{ key: string; averageScore: number; passRate: number; sampleCount: number }>) => {
    const lines = [
      `## ${title}`,
      "",
      "| Segment | Avg Score | Pass Rate | Samples |",
      "|---|---:|---:|---:|",
      ...rows.map((row) => `| ${row.key} | ${formatScore(row.averageScore)} | ${formatScore(row.passRate)}% | ${row.sampleCount} |`),
      "",
    ];
    return lines;
  };

  const header = [
    "# Smart Reply Pro Evaluation Report",
    "",
    `Generated: ${summary.generatedAt}`,
    `Strategy version: ${runConfig.strategyVersion}`,
    `Target cases: ${runConfig.targetCaseCount}`,
    `Total cases: ${summary.totalCases}`,
    `Total options: ${summary.totalOptions}`,
    `Options per case: ${runConfig.optionsPerCase}`,
    `Judge enabled: ${runConfig.useLlmJudge ? "yes" : "no"}`,
    `Judge model: ${runConfig.judgeModel}`,
    `Average score: ${formatScore(summary.averageScore)}/10`,
    `Pass rate: ${formatScore(summary.passRate)}%`,
    `Average duration: ${formatScore(summary.averageDurationMs)}ms`,
    "",
    "## Most Common Failure Modes",
    "",
    ...summary.commonFailures.slice(0, 10).map((failure) => `- ${failure.code}: ${failure.count}`),
    "",
    "## Weakest Message Types",
    "",
    ...summary.weakestMessageTypes.map((item) => `- ${item.key}: ${formatScore(item.averageScore)} (${item.sampleCount} samples)`),
    "",
    "## Strongest Message Types",
    "",
    ...summary.strongestMessageTypes.map((item) => `- ${item.key}: ${formatScore(item.averageScore)} (${item.sampleCount} samples)`),
    "",
    "## Results",
    "",
  ];

  const regressionSection = report.regression
    ? [
      "## Regression Delta",
      "",
      `Baseline: ${report.regression.baselineReport}`,
      `Candidate: ${report.regression.candidateReport}`,
      `Average score delta: ${formatScore(report.regression.averageScoreDelta)}`,
      `Pass rate delta: ${formatScore(report.regression.passRateDelta)}%`,
      "",
      "### Domain Deltas",
      "",
      ...report.regression.byDomainDelta.map((item) => `- ${item.key}: ${formatScore(item.delta)}`),
      "",
    ]
    : [];

  const domainSection = aggregateTable("Score by Domain", summary.byDomain);
  const pressureSection = aggregateTable("Score by Pressure", summary.byPressure);
  const intentSection = aggregateTable("Score by Intent", summary.byIntent);

  const rows = results.flatMap((result) => {
    const optionRows = result.options.flatMap((option) => {
      const errors = option.errors?.length ? option.errors.join(" | ") : "none";
      const hardFailures = option.final.hardFailures.length
        ? option.final.hardFailures.map((item) => `${item.code} (${item.severity})`).join(", ")
        : "none";

      return [
        `#### ${option.option.optionId} (${option.option.tone}/${option.option.variant})`,
        `- Final score: ${formatScore(option.finalScore)}/10`,
        `- Pass: ${option.final.pass ? "yes" : "no"}`,
        `- Hard failures: ${hardFailures}`,
        `- Weaknesses: ${option.final.weaknesses.length ? option.final.weaknesses.join(" | ") : "none"}`,
        `- Revision direction: ${option.final.revisionDirection}`,
        `- Duration: ${option.durationMs}ms`,
        `- Errors: ${errors}`,
        "",
        "Reply:",
        `> ${option.option.reply}`,
        "",
      ];
    });

    return [
      `### ${result.caseId} (${result.domain})`,
      `- Base case: ${result.baseId}`,
      `- Context label: ${result.contextLabel}`,
      `- Pressure/Intent/Power: ${result.pressureLabel} / ${result.intentLabel} / ${result.powerDynamicLabel}`,
      `- Average option score: ${formatScore(result.averageOptionScore)}/10`,
      `- Top option: ${result.topOptionId ?? "n/a"}`,
      `- Failed options: ${result.failedOptions}/${result.options.length}`,
      "",
      ...optionRows,
    ];
  });

  return [...header, ...regressionSection, ...domainSection, ...pressureSection, ...intentSection, ...rows].join("\n");
}

export async function writeReportFiles(report: EvaluationReport, customName?: string) {
  const root = process.cwd();
  const outputDir = path.join(root, "evaluation", "reports");
  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const stem = customName?.trim() || `report-${timestamp}`;
  const jsonPath = path.join(outputDir, `${stem}.json`);
  const mdPath = path.join(outputDir, `${stem}.md`);

  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(mdPath, toMarkdown(report), "utf8");

  return { jsonPath, mdPath };
}
