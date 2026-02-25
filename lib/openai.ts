import { getOpenAiEnv } from "./env";

const SYSTEM_PROMPT = `You are a strategic communication engine.
Analyze incoming text for tone, intent, emotional pressure, implied hierarchy, and manipulation signals.
Preserve user leverage when necessary.
Avoid unnecessary politeness.
Keep responses concise, structured, and confident.
Align output strictly with selected communication mode.`;

async function callOpenAI(messages: Array<{ role: string; content: string }>) {
  const { openAiApiKey } = getOpenAiEnv();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4.1", temperature: 0.5, messages }),
  });
  if (!response.ok) throw new Error("OpenAI request failed");
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() as string;
}

export async function detectTone(input: string) {
  return callOpenAI([
    { role: "system", content: "Classify tone as one of: Aggressive, Passive, Neutral, Manipulative, Emotional. Return only label." },
    { role: "user", content: input },
  ]);
}

export async function generateReply(params: { input: string; context?: string; tone: string; modifier?: string; variant?: string }) {
  const content = `Incoming Message:\n${params.input}\nContext (if any):\n${params.context || "None"}\nDesired Tone:\n${params.tone}\n${params.variant ? `Variation:${params.variant}\n` : ""}${params.modifier ? `${params.modifier}\n` : ""}Return only the final reply.`;
  return callOpenAI([{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content }]);
}

export async function powerScoreAnalysis(input: string, context?: string) {
  return callOpenAI([
    { role: "system", content: "Analyze communication power dynamics. Return strict JSON with keys: score (0-100 number), leverage (string), risks (array of strings), manipulation_detected (boolean)." },
    { role: "user", content: `Message:\n${input}\nContext:\n${context || "None"}` },
  ]);
}
