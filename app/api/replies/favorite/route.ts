import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
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

    // Verify the reply belongs to the user
    const { data: existingReply, error: checkError } = await supabaseService
      .from("replies")
      .select("id")
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

    // Update favorite status
    const { data, error } = await supabaseService
      .from("replies")
      .update({ favorite })
      .eq("id", replyId)
      .select()
      .single();

    if (error) {
      console.error("[replies.favorite] update failed", { userId: user.id, replyId, message: error.message });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.info("[replies.favorite] update complete", { userId: user.id, replyId, favorite: data.favorite });

    return NextResponse.json({ reply: data, success: true });
  } catch (err) {
    console.error("Toggle favorite error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
