import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseService
      .from("conversations")
      .select("id, input_text, reply_text, tone, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ conversations: data ?? [] });
  } catch (error) {
    console.error("Fetch conversations error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
