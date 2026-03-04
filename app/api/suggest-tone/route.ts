import { NextRequest, NextResponse } from "next/server";
import { suggestTone } from "@/lib/openai";
import { requireUser } from "@/lib/auth";
import { getUserProfile } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getUserProfile(user.id);
    const isPro = profile?.subscription_status === "pro";

    const { input } = await req.json();

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
