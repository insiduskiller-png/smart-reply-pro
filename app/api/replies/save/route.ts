import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase";
import { sanitizeText } from "@/lib/security";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const input = sanitizeText(body.input, 4000);
    const context = sanitizeText(body.context, 4000);
    const tone = sanitizeText(body.tone, 64);
    const reply = sanitizeText(body.reply, 4000);

    if (!input || !reply) {
      return NextResponse.json(
        { error: "Input and reply required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseService
      .from("replies")
      .insert({
        user_id: user.id,
        input,
        context: context || null,
        tone: tone || "Professional",
        reply,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ reply: data, success: true });
  } catch (err) {
    console.error("Save reply error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
