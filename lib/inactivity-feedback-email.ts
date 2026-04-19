/**
 * Inactivity feedback email sender.
 *
 * Sends a one-time premium email to users who have been inactive for 4+ days,
 * inviting them to share feedback.
 *
 * Pattern mirrors lib/password-reset-email.ts / lib/email-change-email.ts.
 * Sent from no-reply@smartreplypro.ai via Resend.
 */

const RESEND_API_BASE = "https://api.resend.com";
const FROM_ADDRESS = "SmartReplyPro <no-reply@smartreplypro.ai>";

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

function buildInactivityEmailHtml(firstName: string, feedbackUrl: string) {
  const safeName = escapeHtml(firstName);
  const safeUrl = escapeHtml(feedbackUrl);

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>We'd love your feedback</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:14px 10px;background:#f4f4f5;">
      <tr>
        <td align="center">
          <table role="presentation" width="704" cellpadding="0" cellspacing="0" style="max-width:704px;width:100%;border:1px solid #dddfe4;border-radius:22px;background:#f8f8f8;box-shadow:0 10px 26px rgba(15,23,42,0.10);padding:10px;">
            <tr>
              <td>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #d9deea;border-radius:20px;overflow:hidden;background:#101827;background-image:radial-gradient(circle at 12% 8%,rgba(255,213,138,0.08),transparent 20%),radial-gradient(circle at 80% 88%,rgba(167,139,250,0.08),transparent 22%),radial-gradient(circle at 50% 60%,rgba(255,255,255,0.03),transparent 35%);">
                  <!-- Header -->
                  <tr>
                    <td style="padding:0;background:linear-gradient(90deg,#121c31 0%,#11243d 52%,#13365d 100%);border-bottom:1px solid #2b3a58;">
                      <div style="padding:12px 18px 10px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                          <tr>
                            <td style="vertical-align:middle;">
                              <img src="https://www.smartreplypro.ai/srp-logo.png" width="40" height="40" alt="SmartReplyPro logo" style="display:block;border:0;border-radius:6px;" />
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
                  <!-- Body -->
                  <tr>
                    <td style="padding:28px 26px 18px;background-image:radial-gradient(circle at 20% 18%,rgba(255,255,255,0.03),transparent 20%),radial-gradient(circle at 78% 74%,rgba(255,255,255,0.03),transparent 22%);">
                      <h1 style="margin:0 0 18px;font-size:26px;line-height:1.2;font-weight:700;color:#f8fafc;letter-spacing:-0.02em;">We'd love your feedback</h1>
                      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#d7e0ef;">
                        Hi ${safeName},
                      </p>
                      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#d7e0ef;">
                        We noticed you haven't used SmartReplyPro in a few days and wanted to check in.
                      </p>
                      <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#d7e0ef;">
                        If you ran into any issues, had suggestions, or felt something could be improved, we'd really like to hear from you.
                      </p>
                      <p style="margin:0 0 20px;font-size:16px;line-height:1.5;font-weight:600;color:#f8fafc;">How can we improve?</p>
                      <!-- CTA Button -->
                      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
                        <tr>
                          <td style="border-radius:8px;background:linear-gradient(90deg,#58b8d9 0%,#6f69df 100%);">
                            <a href="${safeUrl}" style="display:inline-block;padding:13px 36px;border-radius:8px;color:#ffffff;font-size:16px;line-height:1.06;font-weight:700;text-decoration:none;text-align:center;">Share Feedback</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#9fb0c7;">
                        If you'd prefer, you can also contact us directly at <a href="mailto:support@smartreplypro.ai" style="color:#8fc8ff;text-decoration:none;">support@smartreplypro.ai</a>.
                      </p>
                      <p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:#d7e0ef;">Thank you for your time,</p>
                      <p style="margin:0;font-size:14px;line-height:1.6;color:#d7e0ef;font-weight:600;">The SmartReplyPro Team</p>
                    </td>
                  </tr>
                  <!-- Support footer -->
                  <tr>
                    <td style="padding:10px 16px;border-top:1px solid #2b3a58;background:rgba(8,13,24,0.42);text-align:center;">
                      <p style="margin:0;font-size:13px;line-height:1.5;color:#d7e0ef;">Need help? Contact <a href="mailto:support@smartreplypro.ai" style="color:#8fc8ff;text-decoration:none;">support@smartreplypro.ai</a></p>
                    </td>
                  </tr>
                  <!-- Legal footer -->
                  <tr>
                    <td style="padding:10px 16px 12px;border-top:1px solid rgba(43,58,88,0.6);background:rgba(8,13,24,0.52);text-align:center;">
                      <p style="margin:0;font-size:11px;line-height:1.45;color:#8e9ab2;">You're receiving this email because you signed up for SmartReplyPro.</p>
                      <p style="margin:4px 0 0;font-size:11px;line-height:1.45;color:#8e9ab2;">SmartReplyPro · <a href="https://www.smartreplypro.ai" style="color:#8e9ab2;text-decoration:none;">smartreplypro.ai</a></p>
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

function buildInactivityEmailText(firstName: string, feedbackUrl: string) {
  return [
    `We'd love your feedback`,
    "",
    `Hi ${firstName},`,
    "",
    "We noticed you haven't used SmartReplyPro in a few days and wanted to check in.",
    "",
    "If you ran into any issues, had suggestions, or felt something could be improved, we'd really like to hear from you.",
    "",
    "How can we improve?",
    "",
    `Share Feedback: ${feedbackUrl}`,
    "",
    "If you'd prefer, you can also contact us directly at support@smartreplypro.ai.",
    "",
    "Thank you for your time,",
    "The SmartReplyPro Team",
    "",
    "---",
    "You're receiving this email because you signed up for SmartReplyPro.",
  ].join("\n");
}

export type SendInactivityEmailInput = {
  toEmail: string;
  firstName: string;
  feedbackUrl: string;
};

export type SendInactivityEmailResult = {
  resendId: string | null;
  fromAddress: string;
  toAddress: string;
};

export class InactivityEmailError extends Error {
  httpStatus: number;
  resendPayload: unknown;

  constructor(message: string, httpStatus: number, resendPayload: unknown) {
    super(message);
    this.name = "InactivityEmailError";
    this.httpStatus = httpStatus;
    this.resendPayload = resendPayload;
  }
}

export async function sendInactivityFeedbackEmail({
  toEmail,
  firstName,
  feedbackUrl,
}: SendInactivityEmailInput): Promise<SendInactivityEmailResult> {
  const apiKey = requireResendApiKey();

  const payload = {
    from: FROM_ADDRESS,
    to: [toEmail],
    subject: "We'd love your feedback",
    html: buildInactivityEmailHtml(firstName, feedbackUrl),
    text: buildInactivityEmailText(firstName, feedbackUrl),
  };

  const response = await fetch(`${RESEND_API_BASE}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    throw new InactivityEmailError(
      `Resend error ${response.status}: ${JSON.stringify(responseBody)}`,
      response.status,
      responseBody,
    );
  }

  return {
    resendId: responseBody?.id ?? null,
    fromAddress: FROM_ADDRESS,
    toAddress: toEmail,
  };
}
