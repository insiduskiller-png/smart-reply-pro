import { NextRequest, NextResponse } from "next/server";
import { suggestTone } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const { input, isPro } = await req.json();

    if (!input?.trim()) {
      return NextResponse.json({ error: "Input required" }, { status: 400 });
    }

    const tone = await suggestTone(input, isPro);

    return NextResponse.json({ tone });
  } catch (error) {
    console.error("Tone suggestion error:", error);
    return NextResponse.json(
      { error: "Failed to suggest tone" },
      { status: 500 }
    );
  }
}
