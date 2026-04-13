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

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    console.info("[replies.favorite] unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const replyId = body.replyId as string;
    const favorite = body.favorite as boolean;

    console.info("[replies.favorite] request", { userId: user.id, replyId, favorite });

    if (!replyId) {
      return NextResponse.json(
        { error: "Reply ID required" },
        { status: 400 }
      );
    }

    const { data: existingReply, error: checkError } = await supabaseService
      .from("replies")
      .select("*")
      .eq("id", replyId)
      .eq("user_id", user.id)
      .single();

    if (checkError || !existingReply) {
      console.error("[replies.favorite] reply not found", { userId: user.id, replyId, message: checkError?.message });
      return NextResponse.json(
        { error: "Reply not found" },
        { status: 404 }
      );
    }

    const updateWithFavoriteColumn = await supabaseService
      .from("replies")
      .update({ favorite })
      .eq("id", replyId)
      .select("*")
      .single();

    if (!updateWithFavoriteColumn.error) {
      console.info("[replies.favorite] update complete", { userId: user.id, replyId, favorite, strategy: "favorite-column" });
      return NextResponse.json({ reply: serializeReplyRow(updateWithFavoriteColumn.data as ReplyRow, true), success: true });
    }

    if (!isMissingFavoriteColumnError(updateWithFavoriteColumn.error)) {
      console.error("[replies.favorite] update failed", { userId: user.id, replyId, message: updateWithFavoriteColumn.error.message });
      return NextResponse.json({ error: updateWithFavoriteColumn.error.message }, { status: 400 });
    }

    const fallbackUpdate = await supabaseService
      .from("replies")
      .update({ context: encodeFavoriteContext(stripFavoriteMarker((existingReply as ReplyRow).context), favorite) })
      .eq("id", replyId)
      .select("*")
      .single();

    if (fallbackUpdate.error) {
      console.error("[replies.favorite] fallback update failed", { userId: user.id, replyId, message: fallbackUpdate.error.message });
      return NextResponse.json({ error: fallbackUpdate.error.message }, { status: 400 });
    }

    console.info("[replies.favorite] update complete", { userId: user.id, replyId, favorite, strategy: "context-marker" });
    return NextResponse.json({ reply: serializeReplyRow(fallbackUpdate.data as ReplyRow, false), success: true });
  } catch (err) {
    console.error("Toggle favorite error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
