/**
 * POST /api/feedback
 *   Submits feedback text.
 *   - Stores the submission in user_feedback table.
 *   - Forwards the message to support@smartreplypro.ai via Resend.
 *   - Marks profile.feedback_submitted_at.
 *
 * GET /api/feedback/status  →  see app/api/feedback/status/route.ts
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase";
import { bootstrapUserProfile } from "@/lib/profile-service";
import { sanitizeText } from "@/lib/security";

const RESEND_API_BASE = "https://api.resend.com";
const FROM_ADDRESS = "SmartReplyPro <no-reply@smartreplypro.ai>";
const SUPPORT_EMAIL = "support@smartreplypro.ai";

function requireResendApiKey() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  return apiKey;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ─── POST /api/feedback ───────────────────────────────────────────────────────

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const feedbackText = sanitizeText(body.feedback, 4000);
    const source: string = ["popup", "inactive_email", "web"].includes(body.source)
      ? body.source
      : "popup";

    if (!feedbackText?.trim()) {
      return NextResponse.json({ error: "Feedback text is required." }, { status: 400 });
    }

    const { profile } = await bootstrapUserProfile(user, { source: "api-feedback-submit" });

    // Idempotency guard — do not allow duplicate submissions.
    if (profile.feedback_submitted_at) {
      return NextResponse.json({ success: true, duplicate: true });
    }

    const userEmail = String(profile.email ?? user.email ?? "").trim();
    const userName = String(profile.username ?? "").trim() || "a user";

    // 1. Store feedback in database.
    const { error: insertError } = await supabaseService
      .from("user_feedback")
      .insert({
        user_id: user.id,
        email: userEmail || null,
        source,
        feedback_text: feedbackText,
        metadata: { user_agent: request.headers.get("user-agent") },
      });

    if (insertError) {
      console.error("[feedback/submit] insert error:", insertError);
      return NextResponse.json({ error: "Failed to save feedback." }, { status: 500 });
    }

    // 2. Mark profile as submitted.
    await supabaseService
      .from("profiles")
      .update({ feedback_submitted_at: new Date().toISOString() })
      .eq("id", user.id);

    // 3. Forward feedback to support inbox via Resend.
    try {
      const apiKey = requireResendApiKey();
      const safeEmail = escapeHtml(userEmail || "unknown");
      const safeName = escapeHtml(userName);
      const safeSource = escapeHtml(source);
      const safeFeedback = escapeHtml(feedbackText);

      const html = `
<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>New Feedback</title></head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,sans-serif;color:#111827;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #e5e7eb;">
    <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">📬 New User Feedback</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#6b7280;width:110px;">From</td><td style="padding:6px 0;color:#111827;font-weight:600;">${safeName} &lt;${safeEmail}&gt;</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Source</td><td style="padding:6px 0;color:#111827;">${safeSource}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">User ID</td><td style="padding:6px 0;color:#6b7280;font-size:12px;">${escapeHtml(user.id)}</td></tr>
    </table>
    <hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb;" />
    <p style="margin:0 0 8px;font-size:14px;color:#6b7280;font-weight:500;">Message</p>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#111827;white-space:pre-wrap;">${safeFeedback}</p>
  </div>
</body>
</html>`;

      await fetch(`${RESEND_API_BASE}/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [SUPPORT_EMAIL],
          reply_to: userEmail || undefined,
          subject: `New feedback from ${userName} (${safeSource})`,
          html,
          text: `New feedback from: ${userName} <${userEmail}>\nSource: ${source}\nUser ID: ${user.id}\n\n${feedbackText}`,
        }),
      });
    } catch (emailErr) {
      // Email forwarding failure is non-fatal — feedback is already stored in DB.
      console.error("[feedback/submit] email forward error:", emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[feedback/submit] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
