type SendRegistrationVerificationEmailInput = {
  toEmail: string;
  username?: string | null;
  verificationUrl: string;
};

export type SendRegistrationVerificationEmailResult = {
  resendId: string | null;
  fromAddress: string;
  toAddress: string;
};

export class RegistrationVerificationEmailError extends Error {
  httpStatus: number;
  resendPayload: unknown;

  constructor(message: string, httpStatus: number, resendPayload: unknown) {
    super(message);
    this.name = "RegistrationVerificationEmailError";
    this.httpStatus = httpStatus;
    this.resendPayload = resendPayload;
  }
}

const RESEND_API_BASE = "https://api.resend.com";
const TO_SUPPORT_EMAIL = "support@smartreplypro.ai";
const FROM_ADDRESS = "Smart Reply Pro <no-reply@smartreplypro.ai>";

function requireResendApiKey() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }
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

function normalizeUsername(username?: string | null) {
  const value = String(username ?? "").trim();
  return value.slice(0, 80);
}

function buildVerificationEmailHtml(params: {
  username: string;
  heading: string;
  verificationUrl: string;
}) {
  const greetingName = params.username ? `Hello ${escapeHtml(params.username)},` : "Hello,";
  const headingMarkup = params.username
    ? `Welcome to Smart Reply Pro, <span style="color:#7CC6FF;">${escapeHtml(params.username)}!</span>`
    : params.heading;

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Confirm your email</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:14px 8px;background:#f3f4f6;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;border:1px solid #e5e7eb;border-radius:18px;background:#fafafa;box-shadow:0 8px 22px rgba(15,23,42,0.10);padding:18px;">
            <tr>
              <td>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #d8dee8;border-radius:18px;overflow:hidden;background:radial-gradient(130% 120% at 90% 100%,#262f4d 0%,#1a2238 42%,#12192b 72%,#0f1523 100%);background-color:#111827;">
                  <tr>
                    <td style="padding:0;background:linear-gradient(90deg,#121c31 0%,#11243d 52%,#13365d 100%);border-bottom:1px solid #2b3a58;">
                      <div style="padding:15px 20px 13px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                          <tr>
                            <td style="vertical-align:middle;">
                              <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Smart Reply Pro logo">
                                <circle cx="20" cy="20" r="20" fill="#1E2A44"/>
                                <path d="M7 22.5C7 15.6 12.6 10 19.5 10H21.5C28.4 10 34 15.6 34 22.5C34 29.4 28.4 35 21.5 35H19.5C12.6 35 7 29.4 7 22.5Z" fill="url(#srpLogoGlow)"/>
                                <circle cx="14.2" cy="15.2" r="3.4" fill="#FFD08B"/>
                                <defs>
                                  <linearGradient id="srpLogoGlow" x1="7" y1="10" x2="34" y2="35" gradientUnits="userSpaceOnUse">
                                    <stop stop-color="#FFB26B"/>
                                    <stop offset="0.55" stop-color="#F0844D"/>
                                    <stop offset="1" stop-color="#2F426B"/>
                                  </linearGradient>
                                </defs>
                              </svg>
                            </td>
                            <td style="vertical-align:middle;padding-left:10px;font-size:0;line-height:1;">
                              <span style="font-size:17px;line-height:1.1;font-weight:700;color:#F8FAFC;letter-spacing:-0.02em;">Smart Reply </span>
                              <span style="font-size:17px;line-height:1.1;font-weight:700;color:#74C6FF;letter-spacing:-0.02em;">Pro</span>
                            </td>
                          </tr>
                        </table>
                      </div>
                      <div style="height:3px;background:linear-gradient(90deg,#FFB26B 0%,#8577F4 52%,#56CBFF 100%);"></div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px 22px 18px;background-image:radial-gradient(circle at 20% 18%,rgba(255,255,255,0.04),transparent 20%),radial-gradient(circle at 78% 74%,rgba(255,255,255,0.03),transparent 22%);">
                      <h1 style="margin:0 0 14px;font-size:22px;line-height:1.22;font-weight:700;color:#f8fafc;letter-spacing:-0.02em;">${headingMarkup}</h1>
                      <p style="margin:0 0 14px;font-size:14px;line-height:1.45;color:#f1f5f9;font-weight:500;">${greetingName}</p>
                      <p style="margin:0 0 12px;font-size:14px;line-height:1.55;color:#d7e0ef;max-width:500px;">Thank you for signing up for Smart Reply Pro. Please confirm your email address to activate your account and continue using the platform.</p>
                      <p style="margin:0 0 9px;font-size:14px;line-height:1.55;color:#d7e0ef;max-width:500px;"><strong><em>Top Key Benefits of Smart Reply Pro are:</em></strong></p>
                      <ul style="margin:0 0 16px 20px;padding:0;color:#d7e0ef;font-size:14px;line-height:1.55;max-width:530px;">
                        <li style="margin:0 0 6px;"><strong style="color:#f8fafc;">Human-Like Replies</strong> — Generate natural, context-aware responses that sound real.</li>
                        <li style="margin:0 0 6px;"><strong style="color:#f8fafc;">Customizable Responses</strong> — Tailor your responses to fit your unique style and tone.</li>
                        <li style="margin:0;"><strong style="color:#f8fafc;">Advanced AI Technology</strong> — Powered by cutting-edge AI to provide accurate and context-aware suggestions.</li>
                      </ul>
                      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
                        <tr>
                          <td style="border-radius:8px;background:linear-gradient(90deg,#58b8d9 0%,#6f69df 100%);">
                            <a href="${escapeHtml(params.verificationUrl)}" style="display:inline-block;padding:11px 28px;border-radius:8px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;min-width:126px;text-align:center;">Confirm Email</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:#d7e0ef;max-width:500px;">If you have any questions or need assistance, feel free to reach out to us.</p>
                      <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#d7e0ef;max-width:500px;">Happy replying!</p>
                      <p style="margin:0;font-size:14px;line-height:1.55;color:#8fc8ff;max-width:500px;">The Smart Reply Pro Team</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 16px;border-top:1px solid #2b3a58;background:rgba(8,13,24,0.42);text-align:center;">
                      <p style="margin:0;font-size:13px;line-height:1.5;color:#d7e0ef;">Need help? Contact us at <a href="mailto:${TO_SUPPORT_EMAIL}" style="color:#8fc8ff;text-decoration:none;">${TO_SUPPORT_EMAIL}</a></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-top:1px solid rgba(43,58,88,0.6);background:rgba(8,13,24,0.52);text-align:center;">
                      <p style="margin:0;font-size:13px;color:#9fb2d3;">Smart Reply Pro</p>
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

function buildVerificationEmailText(params: {
  username: string;
  heading: string;
  verificationUrl: string;
}) {
  const greeting = params.username ? `Hello ${params.username},` : "Hello,";
  return [
    params.heading,
    "",
    greeting,
    "",
    "Thank you for signing up for Smart Reply Pro. Please confirm your email address to activate your account and continue using the platform.",
    "",
    "Top Key Benefits of Smart Reply Pro are:",
    "- Human-Like Replies — Generate natural, context-aware responses that sound real.",
    "- Customizable Responses — Tailor your responses to fit your unique style and tone.",
    "- Advanced AI Technology — Powered by cutting-edge AI to provide accurate and context-aware suggestions.",
    "",
    "Confirm Email:",
    params.verificationUrl,
    "",
    "If you have any questions, reply to support@smartreplypro.ai",
    "Happy replying!",
    "The Smart Reply Pro Team",
    "",
    "Smart Reply Pro",
  ].join("\n");
}

export async function sendRegistrationVerificationEmail(
  input: SendRegistrationVerificationEmailInput,
): Promise<SendRegistrationVerificationEmailResult> {
  const apiKey = requireResendApiKey();
  const normalizedUsername = normalizeUsername(input.username);
  const heading = normalizedUsername
    ? `Welcome to Smart Reply Pro, ${escapeHtml(normalizedUsername)}!`
    : "Welcome to Smart Reply Pro!";

  const html = buildVerificationEmailHtml({
    username: normalizedUsername,
    heading,
    verificationUrl: input.verificationUrl,
  });

  const text = buildVerificationEmailText({
    username: normalizedUsername,
    heading: normalizedUsername ? `Welcome to Smart Reply Pro, ${normalizedUsername}!` : "Welcome to Smart Reply Pro!",
    verificationUrl: input.verificationUrl,
  });

  const response = await fetch(`${RESEND_API_BASE}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [input.toEmail],
      reply_to: TO_SUPPORT_EMAIL,
      subject: "Confirm your Smart Reply Pro account",
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
    throw new RegistrationVerificationEmailError(message, response.status, payload);
  }

  const payload = await response.json().catch(() => null);
  return {
    resendId: typeof payload?.id === "string" ? payload.id : null,
    fromAddress: FROM_ADDRESS,
    toAddress: input.toEmail,
  };
}
