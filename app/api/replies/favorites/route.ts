import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { FAVORITE_CONTEXT_PREFIX, isMissingFavoriteColumnError, serializeReplyRow, type ReplyRow } from "@/lib/reply-persistence";
import { supabaseService } from "@/lib/supabase";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    console.info("[replies.favorites] unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.info("[replies.favorites] request", { userId: user.id });
    console.info("favorites-read-attempt", { route: "/api/replies/favorites", userId: user.id });

    const queryWithFavoriteColumn = await supabaseService
      .from("replies")
      .select("*")
      .eq("user_id", user.id)
      .eq("favorite", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!queryWithFavoriteColumn.error) {
      console.info("[replies.favorites] query complete", { userId: user.id, count: queryWithFavoriteColumn.data?.length ?? 0, strategy: "favorite-column" });
      console.info("favorites-read-result", {
        route: "/api/replies/favorites",
        userId: user.id,
        ok: true,
        count: queryWithFavoriteColumn.data?.length ?? 0,
        strategy: "favorite-column",
      });
      return NextResponse.json({ replies: (queryWithFavoriteColumn.data || []).map((row) => serializeReplyRow(row as ReplyRow, true)) });
    }

    if (!isMissingFavoriteColumnError(queryWithFavoriteColumn.error)) {
      console.error("[replies.favorites] query failed", { userId: user.id, message: queryWithFavoriteColumn.error.message });
      console.info("favorites-read-result", {
        route: "/api/replies/favorites",
        userId: user.id,
        ok: false,
        stage: "favorite-column-query",
        error: queryWithFavoriteColumn.error.message,
        code: (queryWithFavoriteColumn.error as { code?: string }).code || null,
      });
      return NextResponse.json({ error: queryWithFavoriteColumn.error.message }, { status: 400 });
    }

    const fallbackQuery = await supabaseService
      .from("replies")
      .select("*")
      .eq("user_id", user.id)
      .like("context", `${FAVORITE_CONTEXT_PREFIX}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (fallbackQuery.error) {
      console.error("[replies.favorites] fallback query failed", { userId: user.id, message: fallbackQuery.error.message });
      console.info("favorites-read-result", {
        route: "/api/replies/favorites",
        userId: user.id,
        ok: false,
        stage: "context-marker-query",
        error: fallbackQuery.error.message,
        code: (fallbackQuery.error as { code?: string }).code || null,
      });
      return NextResponse.json({ error: fallbackQuery.error.message }, { status: 400 });
    }

    console.info("[replies.favorites] query complete", { userId: user.id, count: fallbackQuery.data?.length ?? 0, strategy: "context-marker" });
    console.info("favorites-read-result", {
      route: "/api/replies/favorites",
      userId: user.id,
      ok: true,
      count: fallbackQuery.data?.length ?? 0,
      strategy: "context-marker",
    });
    return NextResponse.json({ replies: (fallbackQuery.data || []).map((row) => serializeReplyRow(row as ReplyRow, false)) });
  } catch (err) {
    console.error("Fetch favorites error:", err);
    console.info("favorites-read-result", { route: "/api/replies/favorites", userId: user.id, ok: false, error: "exception" });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
