import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Count generations in the last 24 hours
    const { data: limitData, error: limitError, count } = await supabaseService
      .from("usage_limits")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .gte("created_at", twentyFourHoursAgo);

    if (limitError) {
      console.error("Usage count error:", limitError);
      return NextResponse.json({ error: limitError.message }, { status: 400 });
    }

    const messagesUsed = count ?? 0;
    const limit = 5;

    return NextResponse.json({
      messagesUsed,
      limit,
      remaining: Math.max(0, limit - messagesUsed),
    });
  } catch (err) {
    console.error("Messages usage fetch error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
