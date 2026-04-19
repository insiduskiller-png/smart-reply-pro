/**
 * GET /api/cron/inactivity-email
 *
 * Vercel Cron Job handler — runs once per day (configured in vercel.json).
 * Finds registered users who have been inactive for 4+ full days,
 * have not yet received an inactivity email for this inactive stretch,
 * and sends them exactly one feedback email.
 *
 * Security: protected by CRON_SECRET header (set in Vercel env vars).
 *
 * Re-entry safety:
 *   - inactivity_email_sent_at is set after sending.
 *   - A user only qualifies if:
 *       last_activity_at is older than 4 days ago
 *       AND (inactivity_email_sent_at IS NULL
 *            OR inactivity_email_sent_at < last_activity_at)
 *   - This means if the user becomes active again and then goes inactive
 *     for another 4-day stretch, they will receive one more email.
 *   - They will never receive more than one email per inactivity cycle.
 */

import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import { sendInactivityFeedbackEmail } from "@/lib/inactivity-feedback-email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.smartreplypro.ai";
/** Days of inactivity before the email is sent. */
const INACTIVITY_DAYS = 4;
/** Max users to process per cron run — prevents memory issues on free tier. */
const BATCH_SIZE = 50;

export async function GET(request: Request) {
  // Always require CRON_SECRET — both to authenticate the caller and to ensure
  // the env var is intentionally configured before the endpoint does any work.
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    console.error("[cron/inactivity-email] CRON_SECRET is not configured.");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - INACTIVITY_DAYS);
  const cutoff = cutoffDate.toISOString();

  try {
    // Find users who:
    // - have a last_activity_at older than the cutoff (i.e. inactive 4+ days)
    // - have NOT received an inactivity email for this inactive stretch
    //   (email never sent, OR last email was sent BEFORE the user's last activity,
    //    meaning they went inactive again after returning — a new cycle)
    // - have not already submitted feedback (no need to nudge them)
    const { data: candidates, error } = await supabaseService
      .from("profiles")
      .select("id, email, username, last_activity_at, inactivity_email_sent_at")
      .lt("last_activity_at", cutoff)
      .is("feedback_submitted_at", null) // skip users who already gave feedback
      .not("email", "is", null)
      .limit(BATCH_SIZE);

    if (error) {
      console.error("[cron/inactivity-email] query error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ sent: 0, skipped: 0, message: "No candidates." });
    }

    let sent = 0;
    let skipped = 0;

    for (const user of candidates) {
      // Skip if this user already has an inactivity email for this cycle:
      // the email was sent AFTER their last activity (meaning current inactive stretch is covered).
      if (
        user.inactivity_email_sent_at &&
        user.last_activity_at &&
        new Date(user.inactivity_email_sent_at) > new Date(user.last_activity_at)
      ) {
        skipped++;
        continue;
      }

      // Also skip if they have no last_activity_at at all (new users who never used the app).
      if (!user.last_activity_at) {
        skipped++;
        continue;
      }

      const firstName = deriveFirstName(user.username, user.email);
      const feedbackUrl = `${APP_URL}/feedback?source=inactive_email&uid=${encodeURIComponent(user.id)}`;

      try {
        await sendInactivityFeedbackEmail({
          toEmail: user.email,
          firstName,
          feedbackUrl,
        });

        // Mark as sent — prevents duplicate emails for this inactivity cycle.
        await supabaseService
          .from("profiles")
          .update({ inactivity_email_sent_at: new Date().toISOString() })
          .eq("id", user.id);

        sent++;
        console.info("[cron/inactivity-email] sent to:", {
          userId: user.id,
          email: maskEmail(user.email),
        });
      } catch (emailErr) {
        console.error("[cron/inactivity-email] failed to send:", {
          userId: user.id,
          error: String(emailErr),
        });
        skipped++;
      }
    }

    return NextResponse.json({ sent, skipped, total: candidates.length });
  } catch (err) {
    console.error("[cron/inactivity-email] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** Derive a friendly first name from username or email. */
function deriveFirstName(username?: string | null, email?: string | null): string {
  if (username?.trim()) {
    // Take the first word/segment only so "john_doe" → "john"
    const first = username.trim().split(/[_.\-\s]/)[0];
    if (first && first.length > 0) {
      return capitalize(first);
    }
  }
  if (email?.trim()) {
    const localPart = email.split("@")[0] ?? "";
    const first = localPart.split(/[_.\-\s]/)[0];
    if (first && first.length > 0) {
      return capitalize(first);
    }
  }
  return "there";
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}
