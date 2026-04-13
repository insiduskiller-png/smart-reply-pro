import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const replyId = body.replyId as string;

    if (!replyId) {
      return NextResponse.json({ error: "Reply ID required" }, { status: 400 });
    }

    const archivedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseService
      .from("replies")
      .update({ created_at: archivedAt })
      .eq("id", replyId)
      .eq("user_id", user.id)
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Reply not found" }, { status: 400 });
    }

    return NextResponse.json({ success: true, replyId: data.id });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
