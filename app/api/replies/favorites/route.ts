import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    console.info("[replies.favorites] unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.info("[replies.favorites] request", { userId: user.id });

    const { data, error } = await supabaseService
      .from("replies")
      .select("*")
      .eq("user_id", user.id)
      .eq("favorite", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[replies.favorites] query failed", { userId: user.id, message: error.message });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.info("[replies.favorites] query complete", { userId: user.id, count: data?.length ?? 0 });

    return NextResponse.json({ replies: data || [] });
  } catch (err) {
    console.error("Fetch favorites error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
