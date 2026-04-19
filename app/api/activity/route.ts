/**
 * POST /api/activity
 * Records a meaningful last-activity timestamp for the authenticated user.
 * Called from the client after meaningful product actions (e.g. generating
 * a reply, opening the dashboard).
 *
 * Only meaningful product actions should call this — not raw mouse events
 * or tab visibility changes.
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
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) {
      console.error("[activity] update error:", error);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[activity] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
