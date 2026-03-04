import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseService
      .from("replies")
      .select("*")
      .eq("user_id", user.id)
      .eq("favorite", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ replies: data || [] });
  } catch (err) {
    console.error("Fetch favorites error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
