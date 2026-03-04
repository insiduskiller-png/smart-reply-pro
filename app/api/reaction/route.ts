import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/security";
import { predictLikelyReaction } from "@/lib/openai";

type ReactionPayload = {
  positive: number;
  neutral: number;
  negative: number;
  why: string;
};

function normalizePercent(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function maxTwoSentences(value: string) {
  const cleaned = sanitizeText(value, 240);
  const parts = cleaned.match(/[^.!?]+[.!?]?/g)?.map((part) => part.trim()).filter(Boolean) ?? [];
  return parts.slice(0, 2).join(" ");
}

function normalizeReaction(data: Partial<ReactionPayload>): ReactionPayload {
  const positive = normalizePercent(data.positive);
  const neutral = normalizePercent(data.neutral);
  const negative = normalizePercent(data.negative);

  const total = positive + neutral + negative;
  if (total === 100) {
    return {
      positive,
      neutral,
      negative,
      why: maxTwoSentences(data.why ?? ""),
    };
  }

  if (total === 0) {
    return {
      positive: 60,
      neutral: 25,
      negative: 15,
      why: maxTwoSentences(data.why ?? ""),
    };
  }

  const scaledPositive = Math.round((positive / total) * 100);
  const scaledNeutral = Math.round((neutral / total) * 100);
  const scaledNegative = 100 - scaledPositive - scaledNeutral;

  return {
    positive: Math.max(0, scaledPositive),
    neutral: Math.max(0, scaledNeutral),
    negative: Math.max(0, scaledNegative),
    why: maxTwoSentences(data.why ?? ""),
  };
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const reply = sanitizeText(body.reply, 4000);

    if (!reply) {
      return NextResponse.json({ error: "Reply is required" }, { status: 400 });
    }

    const raw = await predictLikelyReaction(reply);
    const parsed = JSON.parse(raw) as Partial<ReactionPayload>;
    const normalized = normalizeReaction(parsed);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Reaction predictor error:", error);
    return NextResponse.json({ error: "Failed to predict reaction" }, { status: 500 });
  }
}
