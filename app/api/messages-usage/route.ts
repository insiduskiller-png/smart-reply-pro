import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import { hasProAccess } from "@/lib/billing";
import { bootstrapUserProfile } from "@/lib/profile-service";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { profile } = await bootstrapUserProfile(user, { source: "api-messages-usage" });
    const isPro = hasProAccess(profile.subscription_status);

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabaseService
      .from("usage")
      .select("count")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Messages usage count error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const messagesUsed = data?.count ?? 0;
    const limit = isPro ? 100 : 5;

    return NextResponse.json({
      messagesUsed,
      limit,
      remaining: Math.max(0, limit - messagesUsed),
      plan: isPro ? "pro" : "free",
    });
  } catch (err) {
    console.error("Messages usage fetch error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
