import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getUserProfile } from "@/lib/supabase";
import { powerScoreAnalysis } from "@/lib/openai";
import { sanitizeText } from "@/lib/security";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getUserProfile(user.id);
  if (profile?.subscription_status !== "pro") {
    return NextResponse.json({ error: "Pro required" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const input = sanitizeText(body.input, 4000);
    const context = sanitizeText(body.context, 4000);
    if (!input) return NextResponse.json({ error: "Input required" }, { status: 400 });

    const raw = await powerScoreAnalysis(input, context);

    try {
      return NextResponse.json(JSON.parse(raw));
    } catch {
      return NextResponse.json({
        score: 50,
        leverage: "Balanced",
        risks: ["Parsing fallback"],
        manipulation_detected: false,
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Power score failed" },
      { status: 500 },
    );
  const { input, context } = await request.json();
  const raw = await powerScoreAnalysis(input, context);

  try {
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ score: 50, leverage: "Balanced", risks: ["Parsing fallback"], manipulation_detected: false });
  }
}
