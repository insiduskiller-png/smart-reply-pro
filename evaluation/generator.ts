import { baseScenarioCases } from "./benchmarks";
import type { BaseScenarioCase, EvaluationCase, ScenarioVariation } from "./types";

const senderTones: ScenarioVariation["senderTone"][] = ["soft", "neutral", "sharp"];
const messageLengths: ScenarioVariation["messageLength"][] = ["short", "medium", "long"];
const politenessLevels: ScenarioVariation["politenessLevel"][] = ["low", "medium", "high"];
const manipulationStyles: ScenarioVariation["manipulationStyle"][] = ["none", "subtle", "explicit"];
const urgencyLevels: ScenarioVariation["urgencyLevel"][] = ["low", "medium", "high"];
const authorityLevels: ScenarioVariation["authorityLevel"][] = [
  "peer",
  "manager",
  "executive",
  "family_senior",
  "romantic_partner",
];
const relationshipContexts: ScenarioVariation["relationshipContext"][] = [
  "dating",
  "work",
  "family",
  "friend",
  "client",
];
const emotionalVolatilities: ScenarioVariation["emotionalVolatility"][] = ["stable", "strained", "volatile"];
const ambiguities: ScenarioVariation["ambiguity"][] = ["low", "medium", "high"];

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function random() {
    t += 0x6d2b79f5;
    let n = Math.imul(t ^ (t >>> 15), t | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: T[], random: () => number): T {
  const index = Math.floor(random() * items.length);
  return items[index] ?? items[0];
}

function compressText(base: string) {
  return base
    .replace(/\s+/g, " ")
    .replace(/\b(very|really|literally|honestly)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function expandText(base: string) {
  return `${base} I want to make sure this is clear and not misread, because the way this lands matters for what happens next.`;
}

function adjustPoliteness(base: string, level: ScenarioVariation["politenessLevel"]) {
  if (level === "low") {
    return base.replace(/please/gi, "").replace(/thanks/gi, "").trim();
  }

  if (level === "high") {
    return `${base} Please be respectful about this.`;
  }

  return base;
}

function addManipulation(base: string, style: ScenarioVariation["manipulationStyle"]) {
  if (style === "explicit") {
    return `${base} If you don't do this now, don't expect me to forget it.`;
  }

  if (style === "subtle") {
    return `${base} I just think this says a lot about priorities.`;
  }

  return base;
}

function addUrgency(base: string, urgency: ScenarioVariation["urgencyLevel"]) {
  if (urgency === "high") {
    return `${base} I need your answer immediately.`;
  }

  if (urgency === "medium") {
    return `${base} Please get back to me soon.`;
  }

  return base;
}

function addAmbiguity(base: string, ambiguity: ScenarioVariation["ambiguity"]) {
  if (ambiguity === "high") {
    return `${base} You know what I mean.`;
  }

  if (ambiguity === "medium") {
    return `${base} You probably get where I'm coming from.`;
  }

  return base;
}

function adjustTone(base: string, tone: ScenarioVariation["senderTone"]) {
  if (tone === "sharp") {
    return base.replace(/\.$/, "") + " — seriously.";
  }

  if (tone === "soft") {
    return `Hey, ${base.charAt(0).toLowerCase()}${base.slice(1)}`;
  }

  return base;
}

function applyVariation(baseMessage: string, variation: ScenarioVariation) {
  let message = baseMessage;

  if (variation.messageLength === "short") {
    message = compressText(message);
  } else if (variation.messageLength === "long") {
    message = expandText(message);
  }

  message = adjustPoliteness(message, variation.politenessLevel);
  message = addManipulation(message, variation.manipulationStyle);
  message = addUrgency(message, variation.urgencyLevel);
  message = addAmbiguity(message, variation.ambiguity);
  message = adjustTone(message, variation.senderTone);

  return message;
}

function createVariation(random: () => number): ScenarioVariation {
  return {
    senderTone: pick(senderTones, random),
    messageLength: pick(messageLengths, random),
    politenessLevel: pick(politenessLevels, random),
    manipulationStyle: pick(manipulationStyles, random),
    urgencyLevel: pick(urgencyLevels, random),
    authorityLevel: pick(authorityLevels, random),
    relationshipContext: pick(relationshipContexts, random),
    emotionalVolatility: pick(emotionalVolatilities, random),
    ambiguity: pick(ambiguities, random),
  };
}

function toContextNotes(baseCase: BaseScenarioCase, variation: ScenarioVariation) {
  return [
    `Context label: ${baseCase.contextLabel}`,
    `Desired strategic direction: ${baseCase.desiredStrategicDirection}`,
    `Pressure: ${baseCase.pressureLabel}`,
    `Intent: ${baseCase.intentLabel}`,
    `Power dynamic: ${baseCase.powerDynamicLabel}`,
    `Authority level: ${variation.authorityLevel}`,
    `Relationship context: ${variation.relationshipContext}`,
    `Emotional volatility: ${variation.emotionalVolatility}`,
    `Avoid: ${baseCase.failurePatternsToAvoid.join(", ")}`,
    `Strength targets: ${baseCase.expectedStrengths.join(", ")}`,
  ].join("\n");
}

export function buildEvaluationDataset(params: {
  targetCaseCount: number;
  seed: number;
  repeats: number;
  idsFilter?: Set<string>;
}) {
  const random = mulberry32(params.seed);
  const source = params.idsFilter?.size
    ? baseScenarioCases.filter((item) => params.idsFilter?.has(item.id))
    : baseScenarioCases;

  if (!source.length) {
    return [] as EvaluationCase[];
  }

  const effectiveTarget = Math.max(source.length, params.targetCaseCount);
  const cases: EvaluationCase[] = [];

  for (let i = 0; i < effectiveTarget; i += 1) {
    const baseCase = source[i % source.length];

    for (let repeat = 0; repeat < Math.max(1, params.repeats); repeat += 1) {
      const variation = createVariation(random);
      const inputMessage = applyVariation(baseCase.message, variation);
      const caseId = `${baseCase.id}__r${repeat + 1}__n${i + 1}`;

      cases.push({
        id: caseId,
        baseId: baseCase.id,
        runSeed: params.seed,
        domain: baseCase.domain,
        contextLabel: baseCase.contextLabel,
        toneLabel: baseCase.toneLabel,
        pressureLabel: baseCase.pressureLabel,
        intentLabel: baseCase.intentLabel,
        powerDynamicLabel: baseCase.powerDynamicLabel,
        desiredStrategicDirection: baseCase.desiredStrategicDirection,
        failurePatternsToAvoid: baseCase.failurePatternsToAvoid,
        expectedStrengths: baseCase.expectedStrengths,
        inputMessage,
        contextNotes: toContextNotes(baseCase, variation),
        variation,
        template: baseCase.template,
        preferredTone: baseCase.preferredTone,
      });

      if (cases.length >= effectiveTarget) {
        return cases;
      }
    }
  }

  return cases;
}
