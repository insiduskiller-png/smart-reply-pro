# Smart Reply Pro Evaluation Harness

Large-scale internal evaluator for Smart Reply Pro strategic reply generation.

It runs inside this repository and reuses the production reply engine from [lib/openai.ts](../lib/openai.ts), so generation behavior matches the real app.

## Harness structure

- [evaluation/types.ts](./types.ts): full schema for cases, variants, scores, failures, reports, regression deltas
- [evaluation/benchmarks.ts](./benchmarks.ts): curated base scenarios across required strategic domains
- [evaluation/generator.ts](./generator.ts): randomized scenario permutation engine
- [evaluation/judge-prompt.ts](./judge-prompt.ts): Smart Reply Pro judge prompt
- [evaluation/judge.ts](./judge.ts): hard-failure detection, heuristic scoring, LLM judging, score blending
- [evaluation/run.ts](./run.ts): high-volume runner with concurrency/options/repeats
- [evaluation/report.ts](./report.ts): markdown/json report writer
- [evaluation/compare.ts](./compare.ts): regression diff between two report JSON files
- [evaluation/reports](./reports): run outputs

## Sample dataset format

Base case fields (curated):

- `message`
- `contextLabel`
- `toneLabel`
- `pressureLabel`
- `intentLabel`
- `powerDynamicLabel`
- `desiredStrategicDirection`
- `failurePatternsToAvoid[]`
- `expectedStrengths[]`

Generated case fields (randomized from base):

- base fields above
- `variation.senderTone`
- `variation.messageLength`
- `variation.politenessLevel`
- `variation.manipulationStyle`
- `variation.urgencyLevel`
- `variation.authorityLevel`
- `variation.relationshipContext`
- `variation.emotionalVolatility`
- `variation.ambiguity`

## Judge prompt

Judge system prompt is in [evaluation/judge-prompt.ts](./judge-prompt.ts).

Core lens:

> “What would the calmest, highest-social-IQ, strategically strongest person reasonably send here?”

Judge output schema (strict JSON):

- `scores` across: strategic accuracy, tone control, leverage preservation, human realism, sendability, brevity discipline, context fit, option differentiation
- `pass` (boolean)
- `rationale`
- `weaknesses[]`
- `revisionDirection`
- `hardFailures[]`

## Scoring system

Per option score is 1–10.

- Heuristic scoring: phrase-pattern failures, brevity discipline, tone/reactivity checks, option differentiation
- LLM scoring: Smart Reply strategic lens from judge prompt
- Final score: blended heuristic + LLM criterion scores
- Hard-failure codes include:
	- `overexplain`
	- `robotic`
	- `unnecessary_apology`
	- `rewards_bad_behavior`
	- `needy`
	- `emotionally_reactive`
	- `therapy_bot_language`
	- `corporate_in_casual_context`
	- `mirrors_manipulative_frame`
	- `option_similarity`

## Randomized scenario generator

[evaluation/generator.ts](./generator.ts) expands each base case into many permutations by varying:

- sender tone
- message length
- politeness
- explicit/subtle manipulation
- urgency
- authority level
- relationship context
- emotional volatility
- ambiguity

This supports 1,000–10,000+ case runs with deterministic seed control.

## Report format

Generated files in [evaluation/reports](./reports):

- JSON: machine-readable report with full option-level judgments
- Markdown: human-readable summary + aggregates + per-case details

Summary includes:

- overall average score
- pass rate
- score by domain/pressure/intent
- most common failure modes
- weakest and strongest message types

## Regression testing flow

1) Run baseline (old prompt/model/logic) and save report.

- `npm run eval:run -- --target=1000 --strategy-version=baseline --out=baseline-v1`

2) Run candidate (new prompt/model/logic) and save report.

- `npm run eval:run -- --target=1000 --strategy-version=candidate --out=candidate-v2`

3) Compare both reports.

- `npm run eval:compare -- --baseline=evaluation/reports/baseline-v1.json --candidate=evaluation/reports/candidate-v2.json --out=baseline-vs-candidate`

Comparison output includes deltas for average score, pass rate, and per-domain score shifts.

## CLI examples

- Quick sanity: `npm run eval:quick`
- Large run (LLM judge enabled): `npm run eval:run -- --target=2000 --options=3 --concurrency=8 --seed=42 --out=full-2k`
- Stress run (heuristics only): `npm run eval:run -- --target=10000 --options=2 --concurrency=10 --no-llm-judge --out=stress-10k`
- Focused IDs: `npm run eval:run -- --ids=work_pressure_01,urgency_01 --target=200 --repeats=5 --out=focused`
