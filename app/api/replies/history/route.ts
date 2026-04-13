import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseService
      .from("replies")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", twoDaysAgo)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ replies: data || [] });
  } catch (err) {
    console.error("Fetch replies error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
