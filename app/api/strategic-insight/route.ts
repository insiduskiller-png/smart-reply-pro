import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/security";
import { generateStrategicInsight } from "@/lib/openai";

function maxTwoSentences(value: string) {
  const cleaned = sanitizeText(value, 280);
  const parts = cleaned.match(/[^.!?]+[.!?]?/g)?.map((part) => part.trim()).filter(Boolean) ?? [];
  return parts.slice(0, 2).join(" ");
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

    const insight = await generateStrategicInsight(reply);
    return NextResponse.json({ insight: maxTwoSentences(insight || "") });
  } catch (error) {
    console.error("Strategic insight error:", error);
    return NextResponse.json({ error: "Failed to generate strategic insight" }, { status: 500 });
  }
}
