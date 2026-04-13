import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase";
import { sanitizeText } from "@/lib/security";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    console.info("[replies.save] unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const input = sanitizeText(body.input, 4000);
    const context = sanitizeText(body.context, 4000);
    const tone = sanitizeText(body.tone, 64);
    const reply = sanitizeText(body.reply, 4000);
    const favorite = body.favorite === true;

    console.info("[replies.save] request", {
      userId: user.id,
      hasInput: Boolean(input),
      hasReply: Boolean(reply),
      hasContext: Boolean(context),
      tone: tone || "Professional",
      favorite,
    });

    if (!input || !reply) {
      return NextResponse.json(
        { error: "Input and reply required" },
        { status: 400 }
      );
    }

    let existingQuery = supabaseService
      .from("replies")
      .select("*")
      .eq("user_id", user.id)
      .eq("input", input)
      .eq("tone", tone || "Professional")
      .eq("reply", reply)
      .order("created_at", { ascending: false })
      .limit(1);

    existingQuery = context
      ? existingQuery.eq("context", context)
      : existingQuery.is("context", null);

    const { data: existingReply, error: existingError } = await existingQuery.maybeSingle();

    if (existingError) {
      console.error("[replies.save] existing lookup failed", { userId: user.id, message: existingError.message });
      return NextResponse.json({ error: existingError.message }, { status: 400 });
    }

    if (existingReply) {
      console.info("[replies.save] existing reply found", {
        userId: user.id,
        replyId: existingReply.id,
        alreadyFavorite: Boolean(existingReply.favorite),
        requestedFavorite: favorite,
      });

      if (favorite && !existingReply.favorite) {
        const { data: updatedReply, error: updateError } = await supabaseService
          .from("replies")
          .update({ favorite: true })
          .eq("id", existingReply.id)
          .select()
          .single();

        if (updateError) {
          console.error("[replies.save] favorite update failed", { userId: user.id, replyId: existingReply.id, message: updateError.message });
          return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        console.info("[replies.save] favorite update complete", { userId: user.id, replyId: updatedReply.id });

        return NextResponse.json({ reply: updatedReply, success: true, created: false, duplicate: false });
      }

      console.info("[replies.save] duplicate reply returned", { userId: user.id, replyId: existingReply.id });
      return NextResponse.json({ reply: existingReply, success: true, created: false, duplicate: true });
    }

    const { data, error } = await supabaseService
      .from("replies")
      .insert({
        user_id: user.id,
        input,
        context: context || null,
        tone: tone || "Professional",
        reply,
        favorite,
      })
      .select()
      .single();

    if (error) {
      console.error("[replies.save] insert failed", { userId: user.id, message: error.message });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.info("[replies.save] insert complete", { userId: user.id, replyId: data.id, favorite: Boolean(data.favorite) });

    return NextResponse.json({ reply: data, success: true, created: true, duplicate: false });
  } catch (err) {
    console.error("Save reply error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
