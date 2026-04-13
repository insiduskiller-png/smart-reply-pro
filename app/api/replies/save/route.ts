import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  encodeFavoriteContext,
  isMissingFavoriteColumnError,
  serializeReplyRow,
  stripFavoriteMarker,
  type ReplyRow,
} from "@/lib/reply-persistence";
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
    const tone = sanitizeText(body.tone, 64) || "Professional";
    const reply = sanitizeText(body.reply, 4000);
    const favorite = body.favorite === true;

    console.info("[replies.save] request", {
      userId: user.id,
      hasInput: Boolean(input),
      hasReply: Boolean(reply),
      hasContext: Boolean(context),
      tone,
      favorite,
    });

    if (!input || !reply) {
      return NextResponse.json(
        { error: "Input and reply required" },
        { status: 400 }
      );
    }

    const { data: existingRows, error: existingError } = await supabaseService
      .from("replies")
      .select("*")
      .eq("user_id", user.id)
      .eq("input", input)
      .eq("tone", tone)
      .eq("reply", reply)
      .order("created_at", { ascending: false })
      .limit(20);

    if (existingError) {
      console.error("[replies.save] existing lookup failed", { userId: user.id, message: existingError.message });
      return NextResponse.json({ error: existingError.message }, { status: 400 });
    }

    const normalizedContext = context || null;
    const existingReply = (existingRows ?? []).find((row) => stripFavoriteMarker((row as ReplyRow).context) === normalizedContext) as ReplyRow | undefined;
    const existingReplyIsFavorite = Boolean(existingReply && ((existingReply.favorite ?? false) || String(existingReply.context ?? "").startsWith("[[SRP_FAVORITE]]\n")));

    if (existingReply) {
      console.info("[replies.save] existing reply found", {
        userId: user.id,
        replyId: existingReply.id,
        alreadyFavorite: existingReplyIsFavorite,
        requestedFavorite: favorite,
      });

      if (favorite && !existingReplyIsFavorite) {
        const updateWithFavoriteColumn = await supabaseService
          .from("replies")
          .update({ favorite: true })
          .eq("id", existingReply.id)
          .select("*")
          .single();

        if (!updateWithFavoriteColumn.error) {
          console.info("[replies.save] favorite update complete", { userId: user.id, replyId: updateWithFavoriteColumn.data.id, strategy: "favorite-column" });
          return NextResponse.json({
            reply: serializeReplyRow(updateWithFavoriteColumn.data as ReplyRow, true),
            success: true,
            created: false,
            duplicate: false,
          });
        }

        if (!isMissingFavoriteColumnError(updateWithFavoriteColumn.error)) {
          console.error("[replies.save] favorite update failed", { userId: user.id, replyId: existingReply.id, message: updateWithFavoriteColumn.error.message });
          return NextResponse.json({ error: updateWithFavoriteColumn.error.message }, { status: 400 });
        }

        const fallbackUpdate = await supabaseService
          .from("replies")
          .update({ context: encodeFavoriteContext(normalizedContext, true) })
          .eq("id", existingReply.id)
          .select("*")
          .single();

        if (fallbackUpdate.error) {
          console.error("[replies.save] fallback favorite update failed", { userId: user.id, replyId: existingReply.id, message: fallbackUpdate.error.message });
          return NextResponse.json({ error: fallbackUpdate.error.message }, { status: 400 });
        }

        console.info("[replies.save] favorite update complete", { userId: user.id, replyId: fallbackUpdate.data.id, strategy: "context-marker" });
        return NextResponse.json({
          reply: serializeReplyRow(fallbackUpdate.data as ReplyRow, false),
          success: true,
          created: false,
          duplicate: false,
        });
      }

      console.info("[replies.save] duplicate reply returned", { userId: user.id, replyId: existingReply.id });
      return NextResponse.json({
        reply: serializeReplyRow(existingReply, Boolean(existingReply.favorite !== undefined)),
        success: true,
        created: false,
        duplicate: true,
      });
    }

    const insertWithFavoriteColumn = await supabaseService
      .from("replies")
      .insert({
        user_id: user.id,
        input,
        context: normalizedContext,
        tone,
        reply,
        favorite,
      })
      .select("*")
      .single();

    if (!insertWithFavoriteColumn.error) {
      console.info("[replies.save] insert complete", { userId: user.id, replyId: insertWithFavoriteColumn.data.id, favorite, strategy: "favorite-column" });
      return NextResponse.json({
        reply: serializeReplyRow(insertWithFavoriteColumn.data as ReplyRow, true),
        success: true,
        created: true,
        duplicate: false,
      });
    }

    if (!isMissingFavoriteColumnError(insertWithFavoriteColumn.error)) {
      console.error("[replies.save] insert failed", { userId: user.id, message: insertWithFavoriteColumn.error.message });
      return NextResponse.json({ error: insertWithFavoriteColumn.error.message }, { status: 400 });
    }

    const fallbackInsert = await supabaseService
      .from("replies")
      .insert({
        user_id: user.id,
        input,
        context: encodeFavoriteContext(normalizedContext, favorite),
        tone,
        reply,
      })
      .select("*")
      .single();

    if (fallbackInsert.error) {
      console.error("[replies.save] fallback insert failed", { userId: user.id, message: fallbackInsert.error.message });
      return NextResponse.json({ error: fallbackInsert.error.message }, { status: 400 });
    }

    console.info("[replies.save] insert complete", { userId: user.id, replyId: fallbackInsert.data.id, favorite, strategy: "context-marker" });
    return NextResponse.json({
      reply: serializeReplyRow(fallbackInsert.data as ReplyRow, false),
      success: true,
      created: true,
      duplicate: false,
    });
  } catch (err) {
    console.error("Save reply error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
