import { getOpenAiEnv } from "./env";

const SYSTEM_PROMPT = `You are Smart Reply Pro — an elite communication strategist.

Your job is to produce responses that are:
- precise
- confident
- intentional
- psychologically aware

You analyze:
• Tone
• Intent
• Hidden pressure
• Emotional leverage
• Status dynamics

Rules:

1. Responses must be concise.
Never use unnecessary sentences.

2. Avoid weak language such as:
"I think"
"Maybe"
"I understand"
"I just wanted"
"No worries"

3. Avoid generic politeness.

4. Never sound like a customer support agent.

5. Never sound robotic.

6. Write like a calm confident professional.

7. Every sentence must have purpose.

8. Remove filler words.

9. Default length: 2–5 sentences maximum.

10. Prioritize clarity over friendliness.

11. Protect the user's position in the conversation.

12. Responses must feel written by a competent adult, not AI.

Writing Realism:

13. Responses must sound like a real person wrote them.

14. Avoid corporate phrases such as:
"I appreciate your message"
"Thank you for reaching out"
"I hope this finds you well"
"Please let me know"
"Feel free to contact me"

15. Use natural phrasing. Write like people actually talk.

16. Slight imperfection is allowed if it improves realism (avoid over-polishing).

17. Avoid over-structured paragraphs.

18. Avoid long explanations.

19. Avoid robotic grammar.

20. Responses should be indistinguishable from a confident human writer.

Authority and Presence:

21. Remove apologetic tone unless absolutely necessary.

22. Avoid submissive language.

23. Avoid over-explaining.

24. Use decisive statements.

Examples:
- Instead of: "I would be happy to help with that."
  Use: "I can handle that."
- Instead of: "Please let me know if this works."
  Use: "Confirm if this works."
- Instead of: "Sorry, but I think..."
  Use: "That won't work because..."
- Instead of: "I hope you understand..."
  Use: "Here's what's happening."

25. Responses must feel composed and self-assured.

Response Efficiency:

26. Remove redundant sentences.

27. Remove repeated ideas.

28. Use fewer words when possible.

29. Default reply length: 30–80 words.
Never exceed 120 words unless absolutely necessary.

30. Goal: Maximum clarity with minimum text.

Leverage Optimization:

31. Maintain user advantage. Never diminish user position.

32. Avoid commitment traps. Don't over-commit or create obligations.

33. Avoid over-promising. Be realistic about what can be delivered.

34. Avoid emotional submission. Never sound desperate, needy, or accommodating.

35. Prefer neutral authority. Sound assured without being aggressive.

36. Avoid over-agreeable tone. It signals weakness.

37. If disagreement is necessary, state it clearly without apologizing.

38. User never sounds desperate or weak in any response.

Signature Communication Style:

39. Smart Reply Pro replies must feel:
- calm
- intentional
- controlled
- intelligent

40. Never be dramatic.

41. Never be emotional.

42. Never be overly friendly.

43. Never be verbose.

44. Users should recognize a Smart Reply Pro reply immediately by its distinctive voice.

45. The tone is: composed professional with strategic clarity. Think seasoned executive or experienced strategist—not consultant, not support agent, not friend.

Return only the reply.`;

type ChatMessage = { role: "system" | "user"; content: string };

async function callOpenAI(messages: ChatMessage[], temperature = 0.4) {
  const { openAiApiKey } = getOpenAiEnv();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature,
        messages,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = await response.text().catch(() => "");
      throw new Error(`OpenAI request failed: ${payload || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() as string;
  } finally {
    clearTimeout(timeout);
  }
}

export async function detectTone(input: string) {
  return callOpenAI(
    [
      {
        role: "system",
        content:
          "Classify tone as one of: Aggressive, Passive, Neutral, Manipulative, Emotional. Return only label.",
      },
      { role: "user", content: input },
    ],
    0,
  );
}

export async function generateReply(params: {
  input: string;
  context?: string;
  tone: string;
  modifier?: string;
  variant?: string;
}) {
  // Build tone-specific instructions
  let toneInstructions = "";
  
  switch (params.tone) {
    case "Neutral":
      toneInstructions = "Use neutral, balanced language. Professional without being overly formal. Clear and factual.";
      break;
    case "Direct":
      toneInstructions = "Be direct and straightforward. Get to the point immediately. No unnecessary words or pleasantries.";
      break;
    case "Polite":
      toneInstructions = "Use polite, respectful language. Warm and considerate tone. Professional courtesy.";
      break;
    case "Friendly":
      toneInstructions = "Use friendly, approachable language. Warm and personable. Build rapport.";
      break;
    case "Tactical Control":
      toneInstructions = "High leverage response that maintains control and direction of the conversation. Be confident, strategic, and structured. Use calm dominance. Avoid emotional tone. Take the lead in framing the discussion.";
      break;
    case "Precision Authority":
      toneInstructions = "Short authoritative response with maximum clarity and impact. Be brief and direct. Use high-status tone. Minimal words. Strong positioning. Command respect through brevity and confidence.";
      break;
    case "Psychological Edge":
      toneInstructions = "Advanced strategic response that understands intent and power dynamics. Read emotional pressure in the incoming message. Neutralize any manipulation attempts. Maintain leverage through strategic framing. Address underlying intent, not just surface content.";
      break;
    default:
      toneInstructions = "Use clear, professional communication.";
  }

  const analysisPrompt = `Before generating the reply, perform an INTERNAL analysis (do not show this to the user):

1. What does the sender want?
2. Who has leverage in this conversation?
3. What emotional pressure is present?
4. What are the hidden expectations?
5. What manipulation signals are present?
6. What urgency pressure exists?

Use this analysis to inform your response. Then generate the reply based on this internal understanding.

Incoming Message:\n${params.input}\n\nContext (if any):\n${params.context || "None"}\n\nCommunication Mode:\n${params.tone}\n\nMode Instructions:\n${toneInstructions}\n\n${params.variant ? `Variation: ${params.variant}\n` : ""}${params.modifier ? `Additional Modifier: ${params.modifier}\n` : ""}Return ONLY the final reply text. Do not include the analysis.`;

  return callOpenAI([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: analysisPrompt },
  ]);
}

export async function powerScoreAnalysis(input: string, context?: string) {
  return callOpenAI(
    [
      {
        role: "system",
        content:
          "Analyze communication power dynamics and return strict JSON with these keys:\n- score: 0-100 overall power balance number\n- leverage: brief string describing leverage type\n- assertiveness_score: 0-100 how assertive the message is\n- tone_detected: detected tone (Aggressive, Passive, Neutral, Manipulative, Emotional)\n- pressure_level: 0-100 how much pressure/urgency the message exerts\n- risks: array of potential communication risks\n- manipulation_detected: boolean\nReturn ONLY valid JSON.",
      },
      { role: "user", content: `Message:\n${input}\nContext:\n${context || "None"}` },
    ]
  );
}

export async function suggestTone(input: string, isPro: boolean = false) {
  const freeTones = ["Neutral", "Direct", "Polite", "Friendly"];
  const preTones = ["Tactical Control", "Precision Authority", "Psychological Edge"];
  const allTones = isPro ? [...freeTones, ...preTones] : freeTones;

  const suggestion = await callOpenAI(
    [
      {
        role: "system",
        content: `Based on the incoming message, suggest the SINGLE best communication tone from this list: ${allTones.join(", ")}. Analyze the emotional content, urgency, and situation severity. Return ONLY the tone name, nothing else.`,
      },
      { role: "user", content: input },
    ],
    0
  );

  // Validate suggestion is in available tones
  if (suggestion && allTones.includes(suggestion)) {
    return suggestion;
  }

  // Fallback to Neutral
  return "Neutral";
}

export async function rewriteReplyWithInstruction(reply: string, instruction: string) {
  return callOpenAI(
    [
      {
        role: "system",
        content:
          `You are an expert communication editor. Rewrite the provided reply while preserving core intent and factual meaning. ${instruction} Return only the rewritten reply text.`,
      },
      { role: "user", content: `Original reply:\n${reply}` },
    ],
    0.3,
  );
}

export async function predictLikelyReaction(reply: string) {
  return callOpenAI(
    [
      {
        role: "system",
        content:
          "Analyze the reply and estimate likely reaction percentages. Return strict JSON only with keys: positive, neutral, negative, why. Percentages must be integers that sum to 100. Keep why to maximum 2 sentences.",
      },
      {
        role: "user",
        content:
          `Analyze the reply and estimate likely reaction percentages.\nOutput format:\nPositive: %\nNeutral: %\nNegative: %\n\nReply:\n${reply}`,
      },
    ],
    0.2,
  );
}

export async function generateStrategicInsight(reply: string) {
  return callOpenAI(
    [
      {
        role: "system",
        content:
          "Explain why this reply maintains leverage and clarity. Max length: 2 sentences. Style: analytical. No generic advice. Return only the insight text.",
      },
      {
        role: "user",
        content: `Reply:\n${reply}`,
      },
    ],
    0.2,
  );
}
