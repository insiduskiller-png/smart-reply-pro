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
  console.info("save-route-hit", { route: "/api/replies/save" });
  const user = await requireUser();
  if (!user) {
    console.info("[replies.save] unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.info("save-user-id", { userId: user.id });

  try {
    const body = await request.json().catch(() => ({}));
    const input = sanitizeText(body.input, 4000);
    const context = sanitizeText(body.context, 4000);
    const tone = sanitizeText(body.tone, 64) || "Professional";
    const reply = sanitizeText(body.reply, 4000);
    const favorite = body.favorite === true;
    const operation = favorite ? "favorite-write" : "history-write";

    console.info("[replies.save] request", {
      userId: user.id,
      hasInput: Boolean(input),
      hasReply: Boolean(reply),
      hasContext: Boolean(context),
      tone,
      favorite,
    });

    if (favorite) {
      console.info("favorite-write-attempt", {
        route: "/api/replies/save",
        operation,
        userId: user.id,
        hasInput: Boolean(input),
        hasReply: Boolean(reply),
        hasContext: Boolean(context),
        tone,
      });
    } else {
      console.info("history-write-route-hit", { route: "/api/replies/save" });
      console.info("history-user-id", { userId: user.id });
      console.info("history-write-attempt", {
        route: "/api/replies/save",
        operation,
        userId: user.id,
        hasInput: Boolean(input),
        hasReply: Boolean(reply),
        hasContext: Boolean(context),
        tone,
      });
    }

    if (!input || !reply) {
      return NextResponse.json(
        { error: "Input and reply required" },
        { status: 400 }
      );
    }

    if (!favorite) {
      console.info("history-db-attempt", {
        userId: user.id,
        stage: "existing-lookup",
        table: "public.replies",
      });
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

    console.info("save-db-attempt", {
      userId: user.id,
      stage: "existing-lookup",
      favorite,
      table: "public.replies",
    });

    if (existingError) {
      console.error("[replies.save] existing lookup failed", { userId: user.id, message: existingError.message });
      console.info("save-db-result", {
        userId: user.id,
        ok: false,
        stage: "existing-lookup",
        error: existingError.message,
        code: (existingError as { code?: string }).code || null,
      });
      if (!favorite) {
        console.info("history-db-result", {
          userId: user.id,
          ok: false,
          stage: "existing-lookup",
          error: existingError.message,
          code: (existingError as { code?: string }).code || null,
        });
      }
      if (favorite) {
        console.info("favorite-write-result", {
          route: "/api/replies/save",
          operation,
          userId: user.id,
          ok: false,
          stage: "existing-lookup",
          error: existingError.message,
          code: (existingError as { code?: string }).code || null,
        });
      } else {
        console.info("history-write-result", {
          route: "/api/replies/save",
          operation,
          userId: user.id,
          ok: false,
          stage: "existing-lookup",
          error: existingError.message,
          code: (existingError as { code?: string }).code || null,
        });
      }
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
        console.info("save-db-attempt", {
          userId: user.id,
          stage: "favorite-update",
          favorite,
          table: "public.replies",
          replyId: existingReply.id,
        });

        const updateWithFavoriteColumn = await supabaseService
          .from("replies")
          .update({ favorite: true })
          .eq("id", existingReply.id)
          .select("*")
          .single();

        if (!updateWithFavoriteColumn.error) {
          console.info("save-db-result", {
            userId: user.id,
            ok: true,
            stage: "favorite-update",
            strategy: "favorite-column",
            replyId: updateWithFavoriteColumn.data.id,
          });
          console.info("[replies.save] favorite update complete", { userId: user.id, replyId: updateWithFavoriteColumn.data.id, strategy: "favorite-column" });
          console.info("save-response-payload", {
            ok: true,
            created: false,
            duplicate: false,
            replyId: updateWithFavoriteColumn.data.id,
            favorite: true,
          });
          return NextResponse.json({
            reply: serializeReplyRow(updateWithFavoriteColumn.data as ReplyRow, true),
            success: true,
            created: false,
            duplicate: false,
          });
        }

        if (!isMissingFavoriteColumnError(updateWithFavoriteColumn.error)) {
          console.error("[replies.save] favorite update failed", { userId: user.id, replyId: existingReply.id, message: updateWithFavoriteColumn.error.message });
          console.info("save-db-result", {
            userId: user.id,
            ok: false,
            stage: "favorite-update",
            error: updateWithFavoriteColumn.error.message,
            code: (updateWithFavoriteColumn.error as { code?: string }).code || null,
          });
          console.info("favorite-write-result", {
            route: "/api/replies/save",
            operation,
            userId: user.id,
            ok: false,
            stage: "favorite-update",
            error: updateWithFavoriteColumn.error.message,
            code: (updateWithFavoriteColumn.error as { code?: string }).code || null,
          });
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
          console.info("save-db-result", {
            userId: user.id,
            ok: false,
            stage: "favorite-update-fallback",
            error: fallbackUpdate.error.message,
            code: (fallbackUpdate.error as { code?: string }).code || null,
          });
          console.info("favorite-write-result", {
            route: "/api/replies/save",
            operation,
            userId: user.id,
            ok: false,
            stage: "favorite-update-fallback",
            error: fallbackUpdate.error.message,
            code: (fallbackUpdate.error as { code?: string }).code || null,
          });
          return NextResponse.json({ error: fallbackUpdate.error.message }, { status: 400 });
        }

        console.info("[replies.save] favorite update complete", { userId: user.id, replyId: fallbackUpdate.data.id, strategy: "context-marker" });
        console.info("save-db-result", {
          userId: user.id,
          ok: true,
          stage: "favorite-update-fallback",
          strategy: "context-marker",
          replyId: fallbackUpdate.data.id,
        });
        console.info("save-response-payload", {
          ok: true,
          created: false,
          duplicate: false,
          replyId: fallbackUpdate.data.id,
          favorite: true,
          strategy: "context-marker",
        });
        console.info("favorite-write-result", {
          route: "/api/replies/save",
          operation,
          userId: user.id,
          ok: true,
          stage: "favorite-update-fallback",
          strategy: "context-marker",
          replyId: fallbackUpdate.data.id,
        });
        return NextResponse.json({
          reply: serializeReplyRow(fallbackUpdate.data as ReplyRow, false),
          success: true,
          created: false,
          duplicate: false,
        });
      }

      console.info("[replies.save] duplicate reply returned", { userId: user.id, replyId: existingReply.id });
      console.info("save-db-result", {
        userId: user.id,
        ok: true,
        stage: "duplicate",
        replyId: existingReply.id,
      });
      console.info("save-response-payload", {
        ok: true,
        created: false,
        duplicate: true,
        replyId: existingReply.id,
        favorite: existingReplyIsFavorite,
      });
      if (!favorite) {
        console.info("history-db-result", {
          userId: user.id,
          ok: true,
          stage: "duplicate",
          replyId: existingReply.id,
        });
      }
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

    console.info("save-db-attempt", {
      userId: user.id,
      stage: "insert",
      favorite,
      table: "public.replies",
    });

    if (!insertWithFavoriteColumn.error) {
      console.info("save-db-result", {
        userId: user.id,
        ok: true,
        stage: "insert",
        strategy: "favorite-column",
        replyId: insertWithFavoriteColumn.data.id,
      });
      console.info("[replies.save] insert complete", { userId: user.id, replyId: insertWithFavoriteColumn.data.id, favorite, strategy: "favorite-column" });
      if (!favorite) {
        console.info("history-db-result", {
          userId: user.id,
          ok: true,
          stage: "insert",
          strategy: "favorite-column",
          replyId: insertWithFavoriteColumn.data.id,
        });
      }
      if (favorite) {
        console.info("favorite-write-result", {
          route: "/api/replies/save",
          operation,
          userId: user.id,
          ok: true,
          stage: "insert",
          strategy: "favorite-column",
          replyId: insertWithFavoriteColumn.data.id,
        });
      } else {
        console.info("history-write-result", {
          route: "/api/replies/save",
          operation,
          userId: user.id,
          ok: true,
          stage: "insert",
          strategy: "favorite-column",
          replyId: insertWithFavoriteColumn.data.id,
        });
      }
      console.info("save-response-payload", {
        ok: true,
        created: true,
        duplicate: false,
        replyId: insertWithFavoriteColumn.data.id,
        favorite,
        strategy: "favorite-column",
      });
      return NextResponse.json({
        reply: serializeReplyRow(insertWithFavoriteColumn.data as ReplyRow, true),
        success: true,
        created: true,
        duplicate: false,
      });
    }

    if (!isMissingFavoriteColumnError(insertWithFavoriteColumn.error)) {
      console.error("[replies.save] insert failed", { userId: user.id, message: insertWithFavoriteColumn.error.message });
      console.info("save-db-result", {
        userId: user.id,
        ok: false,
        stage: "insert",
        error: insertWithFavoriteColumn.error.message,
        code: (insertWithFavoriteColumn.error as { code?: string }).code || null,
      });
      if (!favorite) {
        console.info("history-db-result", {
          userId: user.id,
          ok: false,
          stage: "insert",
          error: insertWithFavoriteColumn.error.message,
          code: (insertWithFavoriteColumn.error as { code?: string }).code || null,
        });
      }
      if (favorite) {
        console.info("favorite-write-result", {
          route: "/api/replies/save",
          operation,
          userId: user.id,
          ok: false,
          stage: "insert",
          error: insertWithFavoriteColumn.error.message,
          code: (insertWithFavoriteColumn.error as { code?: string }).code || null,
        });
      } else {
        console.info("history-write-result", {
          route: "/api/replies/save",
          operation,
          userId: user.id,
          ok: false,
          stage: "insert",
          error: insertWithFavoriteColumn.error.message,
          code: (insertWithFavoriteColumn.error as { code?: string }).code || null,
        });
      }
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
      console.info("save-db-result", {
        userId: user.id,
        ok: false,
        stage: "insert-fallback",
        error: fallbackInsert.error.message,
        code: (fallbackInsert.error as { code?: string }).code || null,
      });
      if (!favorite) {
        console.info("history-db-result", {
          userId: user.id,
          ok: false,
          stage: "insert-fallback",
          error: fallbackInsert.error.message,
          code: (fallbackInsert.error as { code?: string }).code || null,
        });
      }
      if (favorite) {
        console.info("favorite-write-result", {
          route: "/api/replies/save",
          operation,
          userId: user.id,
          ok: false,
          stage: "insert-fallback",
          error: fallbackInsert.error.message,
          code: (fallbackInsert.error as { code?: string }).code || null,
        });
      } else {
        console.info("history-write-result", {
          route: "/api/replies/save",
          operation,
          userId: user.id,
          ok: false,
          stage: "insert-fallback",
          error: fallbackInsert.error.message,
          code: (fallbackInsert.error as { code?: string }).code || null,
        });
      }
      return NextResponse.json({ error: fallbackInsert.error.message }, { status: 400 });
    }

    console.info("[replies.save] insert complete", { userId: user.id, replyId: fallbackInsert.data.id, favorite, strategy: "context-marker" });
    console.info("save-db-result", {
      userId: user.id,
      ok: true,
      stage: "insert-fallback",
      strategy: "context-marker",
      replyId: fallbackInsert.data.id,
    });
    console.info("save-response-payload", {
      ok: true,
      created: true,
      duplicate: false,
      replyId: fallbackInsert.data.id,
      favorite,
      strategy: "context-marker",
    });
    if (!favorite) {
      console.info("history-db-result", {
        userId: user.id,
        ok: true,
        stage: "insert-fallback",
        strategy: "context-marker",
        replyId: fallbackInsert.data.id,
      });
    }
    if (favorite) {
      console.info("favorite-write-result", {
        route: "/api/replies/save",
        operation,
        userId: user.id,
        ok: true,
        stage: "insert-fallback",
        strategy: "context-marker",
        replyId: fallbackInsert.data.id,
      });
    } else {
      console.info("history-write-result", {
        route: "/api/replies/save",
        operation,
        userId: user.id,
        ok: true,
        stage: "insert-fallback",
        strategy: "context-marker",
        replyId: fallbackInsert.data.id,
      });
    }
    return NextResponse.json({
      reply: serializeReplyRow(fallbackInsert.data as ReplyRow, false),
      success: true,
      created: true,
      duplicate: false,
    });
  } catch (err) {
    console.error("Save reply error:", err);
    console.info("save-db-result", { ok: false, stage: "exception" });
    console.info("save-response-payload", { ok: false, error: "Server error" });
    console.info("favorite-write-result", { route: "/api/replies/save", ok: false, stage: "exception" });
    console.info("history-write-result", { route: "/api/replies/save", ok: false, stage: "exception" });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
