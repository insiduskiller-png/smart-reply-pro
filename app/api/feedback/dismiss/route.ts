/**
 * POST /api/feedback/dismiss
 * Marks the feedback popup as dismissed for the authenticated user.
 * Once dismissed, the popup will not appear again unless the product
 * logic is explicitly changed.
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase";

export async function POST() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { error } = await supabaseService
      .from("profiles")
      .update({
        feedback_popup_dismissed_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("[feedback/dismiss] update error:", error);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[feedback/dismiss] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
