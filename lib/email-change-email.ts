/**
 * Email-change confirmation email sender.
 *
 * Pattern mirrors lib/password-reset-email.ts:
 *  1. Call supabaseService.auth.admin.generateLink() with type "email_change_new".
 *     – This writes `new_email` onto auth.users so Supabase tracks the pending change.
 *     – It returns the action_link BUT DOES NOT SEND ANY EMAIL.
 *  2. We send our own branded email via Resend to the new address.
 *
 * This is the ONLY correct way to ensure the verification email comes from
 * no-reply@smartreplypro.ai instead of Supabase's default sender.
 */

import { supabaseService } from "./supabase";

const RESEND_API_BASE = "https://api.resend.com";
const TO_SUPPORT_EMAIL = "support@smartreplypro.ai";
const FROM_ADDRESS = "Smart Reply Pro <no-reply@smartreplypro.ai>";

function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  if (!local || !domain) return "invalid-email";
  return `${local.slice(0, 2)}***@${domain}`;
}

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

function buildEmailChangeHtml(confirmUrl: string, newEmail: string) {
  const safeUrl = escapeHtml(confirmUrl);
  const safeEmail = escapeHtml(newEmail);
  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Confirm your new email address</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:14px 10px;background:#f4f4f5;">
      <tr>
        <td align="center">
          <table role="presentation" width="704" cellpadding="0" cellspacing="0" style="max-width:704px;width:100%;border:1px solid #dddfe4;border-radius:22px;background:#f8f8f8;box-shadow:0 10px 26px rgba(15,23,42,0.10);padding:10px;">
            <tr>
              <td>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #d9deea;border-radius:20px;overflow:hidden;background:#101827;background-image:radial-gradient(circle at 12% 8%,rgba(255,213,138,0.08),transparent 20%),radial-gradient(circle at 80% 88%,rgba(167,139,250,0.08),transparent 22%),radial-gradient(circle at 50% 60%,rgba(255,255,255,0.03),transparent 35%);">
                  <tr>
                    <td style="padding:0;background:linear-gradient(90deg,#121c31 0%,#11243d 52%,#13365d 100%);border-bottom:1px solid #2b3a58;">
                      <div style="padding:12px 18px 10px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                          <tr>
                            <td style="vertical-align:middle;">
                              <img src="https://www.smartreplypro.ai/srp-logo.png" width="40" height="40" alt="Smart Reply Pro logo" style="display:block;border:0;border-radius:6px;" />
                            </td>
                            <td style="vertical-align:middle;padding-left:6px;font-size:0;line-height:1;">
                              <span style="font-size:18px;line-height:1.08;font-weight:700;color:#F8FAFC;letter-spacing:-0.02em;">Smart Reply </span>
                              <span style="font-size:18px;line-height:1.08;font-weight:700;color:#74C6FF;letter-spacing:-0.02em;">Pro</span>
                            </td>
                          </tr>
                        </table>
                      </div>
                      <div style="height:2px;background:linear-gradient(90deg,#ff9b54 0%,#8b7bff 52%,#54d1ff 100%);"></div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px 26px 14px;">
                      <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;font-weight:700;color:#f8fafc;letter-spacing:-0.02em;">Confirm your new email address</h1>
                      <p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#d7e0ef;max-width:530px;">
                        A request was made to change your Smart Reply Pro account email to <strong style="color:#f8fafc;">${safeEmail}</strong>.<br />
                        Click the button below to confirm this change. If you did not request this, you can safely ignore this email.
                      </p>
                      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
                        <tr>
                          <td style="border-radius:8px;background:linear-gradient(90deg,#58b8d9 0%,#6f69df 100%);">
                            <a href="${safeUrl}" style="display:inline-block;padding:12px 34px;border-radius:8px;color:#ffffff;font-size:16px;line-height:1.06;font-weight:700;text-decoration:none;text-align:center;">Confirm New Email</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:0 0 14px;font-size:13px;line-height:1.55;color:#9fb0c7;word-break:break-word;">If the button doesn't work, copy and paste this link into your browser:<br />${safeUrl}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-top:1px solid #2b3a58;background:rgba(8,13,24,0.42);text-align:center;">
                      <p style="margin:0;font-size:13px;line-height:1.5;color:#d7e0ef;">Need help? Contact <a href="mailto:support@smartreplypro.ai" style="color:#8fc8ff;text-decoration:none;">support@smartreplypro.ai</a></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px 12px;border-top:1px solid rgba(43,58,88,0.6);background:rgba(8,13,24,0.52);text-align:center;">
                      <p style="margin:0;font-size:11px;line-height:1.45;color:#8e9ab2;">Smart Reply Pro</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

function buildEmailChangeText(confirmUrl: string, newEmail: string) {
  return [
    "Confirm your new Smart Reply Pro email address",
    "",
    `A request was made to change your account email to: ${newEmail}`,
    "",
    "Confirm the change by visiting:",
    confirmUrl,
    "",
    "If you did not request this, you can safely ignore this email.",
    "",
    "Need help? Contact support@smartreplypro.ai",
    "Smart Reply Pro",
  ].join("\n");
}

/**
 * Generate an email-change confirmation link via the Supabase admin API
 * (does NOT trigger Supabase to send any email) and send our own branded
 * confirmation email via Resend to the new address.
 *
 * @param currentEmail - The user's current email (used to look up the user)
 * @param newEmail     - The new email the user wants to change to
 * @param redirectTo   - The URL Supabase should redirect to after confirmation
 */
export async function sendEmailChangeConfirmation(
  currentEmail: string,
  newEmail: string,
  redirectTo: string,
): Promise<void> {
  console.info("email-change-helper-used", {
    helper: "lib/email-change-email.sendEmailChangeConfirmation",
    currentEmail: maskEmail(currentEmail),
    newEmail: maskEmail(newEmail),
    redirectTo,
  });

  // Step 1: Tell Supabase about the pending email change and get the
  // confirmation action_link. The admin API does NOT send any email.
  const { data, error } = await supabaseService.auth.admin.generateLink({
    type: "email_change_new",
    email: currentEmail,
    newEmail,
    options: { redirectTo },
  });

  if (error) {
    console.error("email-change-generateLink-error", {
      helper: "lib/email-change-email.sendEmailChangeConfirmation",
      error: error.message,
      currentEmail: maskEmail(currentEmail),
      newEmail: maskEmail(newEmail),
    });
    throw new Error(error.message || "Unable to generate email change confirmation link");
  }

  const confirmUrl = data?.properties?.action_link;
  if (!confirmUrl) {
    throw new Error("Unable to generate email change confirmation link");
  }

  console.info("email-change-link-generated", {
    helper: "lib/email-change-email.sendEmailChangeConfirmation",
    newEmail: maskEmail(newEmail),
  });

  // Step 2: Send branded email via Resend to the NEW address.
  const apiKey = requireResendApiKey();
  const html = buildEmailChangeHtml(confirmUrl, newEmail);
  const text = buildEmailChangeText(confirmUrl, newEmail);

  console.info("email-change-resend-attempt", {
    helper: "lib/email-change-email.sendEmailChangeConfirmation",
    from: FROM_ADDRESS,
    to: maskEmail(newEmail),
  });

  const response = await fetch(`${RESEND_API_BASE}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [newEmail],
      reply_to: TO_SUPPORT_EMAIL,
      subject: "Confirm your new Smart Reply Pro email address",
      html,
      text,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      (typeof payload?.message === "string" ? payload.message : null) ||
      (typeof payload?.error === "string" ? payload.error : null) ||
      `Resend HTTP ${response.status}`;
    console.error("email-change-resend-error", {
      helper: "lib/email-change-email.sendEmailChangeConfirmation",
      status: response.status,
      message,
      newEmail: maskEmail(newEmail),
    });
    throw new Error(message);
  }

  const payload = await response.json().catch(() => null);
  console.info("email-change-resend-success", {
    helper: "lib/email-change-email.sendEmailChangeConfirmation",
    resendId: typeof payload?.id === "string" ? payload.id : null,
    from: FROM_ADDRESS,
    to: maskEmail(newEmail),
  });
}
