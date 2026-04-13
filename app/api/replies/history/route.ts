import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    console.info("[replies.history] unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    console.info("[replies.history] request", { userId: user.id, since: twoDaysAgo });

    const { data, error } = await supabaseService
      .from("replies")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", twoDaysAgo)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("[replies.history] query failed", { userId: user.id, message: error.message });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.info("[replies.history] query complete", { userId: user.id, count: data?.length ?? 0 });

    return NextResponse.json({ replies: data || [] });
  } catch (err) {
    console.error("Fetch replies error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
