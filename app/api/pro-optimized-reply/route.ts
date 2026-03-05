import { NextResponse } from "next/server";
import { generateReply } from "@/lib/openai";
import { requireUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/security";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const input = sanitizeText(body.input, 4000);
    const context = sanitizeText(body.context, 4000);
    const currentTone = sanitizeText(body.tone, 64) || "Neutral";

    if (!input) return NextResponse.json({ error: "Input required" }, { status: 400 });

    // Generate pro optimized reply using "Precision Authority" tone
    // This is the advanced version that demonstrates Pro value
    const proOptimizedReply = await generateReply({
      input,
      context,
      tone: "Precision Authority",
      variant: "Pro Optimized",
    });

    return NextResponse.json({
      proOptimizedReply,
    });
  } catch (error) {
    console.error("Pro optimized reply generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
