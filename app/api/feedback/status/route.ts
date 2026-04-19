/**
 * GET /api/feedback/status
 * Returns whether the feedback popup should be shown to the current user.
 * Checks submission state, dismissal state, and the reply-count threshold.
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase";
import { bootstrapUserProfile } from "@/lib/profile-service";

/** Total saved replies before the popup becomes eligible to show. */
const POPUP_THRESHOLD = 5;

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { profile } = await bootstrapUserProfile(user, { source: "api-feedback-status" });

    // Already submitted — never show popup again.
    if (profile.feedback_submitted_at) {
      return NextResponse.json({ showPopup: false, reason: "submitted" });
    }

    // Already dismissed — never show popup again.
    if (profile.feedback_popup_dismissed_at) {
      return NextResponse.json({ showPopup: false, reason: "dismissed" });
    }

    // Count rows in the `replies` table — this is the live production table
    // written to every time a user saves/generates a reply. It is the correct
    // source of truth for "messages the user has engaged with".
    const { count, error: countError } = await supabaseService
      .from("replies")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      console.error("[feedback/status] count error:", countError);
      return NextResponse.json({ showPopup: false, reason: "error" });
    }

    const totalReplies = count ?? 0;
    const eligible = totalReplies >= POPUP_THRESHOLD;

    return NextResponse.json({
      showPopup: eligible,
      reason: eligible ? "threshold_reached" : "below_threshold",
      totalReplies,
      threshold: POPUP_THRESHOLD,
    });
  } catch (err) {
    console.error("[feedback/status] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
