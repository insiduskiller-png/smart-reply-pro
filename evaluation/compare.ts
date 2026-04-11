import "./load-env";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { writeReportFiles } from "./report";
import type { EvaluationReport, RegressionDelta } from "./types";

function averageScoreByDomain(report: EvaluationReport) {
  return new Map(report.summary.byDomain.map((item) => [item.key, item.averageScore]));
}

function parseArg(name: string, args: string[]) {
  const key = `--${name}=`;
  const match = args.find((arg) => arg.startsWith(key));
  return match ? match.slice(key.length).trim() : "";
}

async function readReport(inputPath: string) {
  const absolute = path.isAbsolute(inputPath) ? inputPath : path.join(process.cwd(), inputPath);
  const content = await readFile(absolute, "utf8");
  return { absolute, report: JSON.parse(content) as EvaluationReport };
}

function buildDelta(params: {
  baselinePath: string;
  candidatePath: string;
  baseline: EvaluationReport;
  candidate: EvaluationReport;
}): RegressionDelta {
  const byDomainBase = averageScoreByDomain(params.baseline);
  const byDomainCandidate = averageScoreByDomain(params.candidate);

  const keys = new Set([...byDomainBase.keys(), ...byDomainCandidate.keys()]);
  const byDomainDelta = [...keys].map((key) => ({
    key,
    delta:
      Math.round((((byDomainCandidate.get(key) ?? 0) - (byDomainBase.get(key) ?? 0)) * 10)) / 10,
  }));

  return {
    baselineReport: params.baselinePath,
    candidateReport: params.candidatePath,
    averageScoreDelta:
      Math.round((params.candidate.summary.averageScore - params.baseline.summary.averageScore) * 10) / 10,
    passRateDelta: Math.round((params.candidate.summary.passRate - params.baseline.summary.passRate) * 10) / 10,
    byDomainDelta: byDomainDelta.sort((a, b) => b.delta - a.delta),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const baselineArg = parseArg("baseline", args);
  const candidateArg = parseArg("candidate", args);
  const outArg = parseArg("out", args) || `comparison-${new Date().toISOString().replace(/[:.]/g, "-")}`;

  if (!baselineArg || !candidateArg) {
    throw new Error("Provide --baseline=<path-to-report.json> and --candidate=<path-to-report.json>");
  }

  const baseline = await readReport(baselineArg);
  const candidate = await readReport(candidateArg);
  const delta = buildDelta({
    baselinePath: baseline.absolute,
    candidatePath: candidate.absolute,
    baseline: baseline.report,
    candidate: candidate.report,
  });

  const merged: EvaluationReport = {
    ...candidate.report,
    regression: delta,
  };

  const output = await writeReportFiles(merged, outArg);

  console.log("Regression comparison complete.");
  console.log(`Average score delta: ${delta.averageScoreDelta}`);
  console.log(`Pass rate delta: ${delta.passRateDelta}%`);
  console.log(`Output JSON: ${output.jsonPath}`);
  console.log(`Output Markdown: ${output.mdPath}`);
}

void main().catch((error) => {
  console.error("Comparison failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
