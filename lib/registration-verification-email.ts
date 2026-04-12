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

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Confirm your email</title>
  </head>
  <body style="margin:0;padding:0;background:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:18px 10px;background:#111827;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;border:1px solid #223047;border-radius:16px;overflow:hidden;background:linear-gradient(180deg,#0f172a 0%,#121d34 55%,#0f172a 100%);box-shadow:0 10px 30px rgba(2,6,23,0.38);">
            <tr>
              <td style="padding:0;background:linear-gradient(90deg,#131d34 0%,#112642 52%,#14365f 100%);border-bottom:1px solid #2b3a58;">
                <div style="height:10px;background:linear-gradient(90deg,#ff9b54 0%,#8b7bff 52%,#54d1ff 100%);"></div>
                <div style="padding:16px 22px 14px;">
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
                        <span style="font-size:16px;line-height:1.1;font-weight:700;color:#F8FAFC;letter-spacing:-0.02em;">Smart Reply </span>
                        <span style="font-size:16px;line-height:1.1;font-weight:700;color:#74C6FF;letter-spacing:-0.02em;">Pro</span>
                      </td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 26px 22px;">
                <h1 style="margin:0 0 12px;font-size:46px;line-height:1.12;font-weight:700;color:#f8fafc;letter-spacing:-0.02em;">${params.heading}</h1>
                <p style="margin:0 0 10px;font-size:16px;line-height:1.45;color:#e2e8f0;font-weight:500;">${greetingName}</p>
                <p style="margin:0 0 10px;font-size:16px;line-height:1.5;color:#d7e0ef;">Thank you for signing up for Smart Reply Pro. Please confirm your email address to activate your account and continue using the platform.</p>
                <p style="margin:0 0 10px;font-size:16px;line-height:1.5;color:#d7e0ef;">Top Key Benefits of Smart Reply Pro are:</p>
                <ul style="margin:0 0 16px 20px;padding:0;color:#d7e0ef;font-size:15px;line-height:1.52;">
                  <li style="margin:0 0 6px;"><strong style="color:#f8fafc;">Human-Like Replies</strong> — Generate natural, context-aware responses that sound real.</li>
                  <li style="margin:0 0 6px;"><strong style="color:#f8fafc;">Customizable Responses</strong> — Tailor your responses to fit your unique style and tone.</li>
                  <li style="margin:0;"><strong style="color:#f8fafc;">Context-Aware Assistance</strong> — Keep your message intent clear and aligned.</li>
                </ul>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 12px;">
                  <tr>
                    <td style="border-radius:10px;background:linear-gradient(90deg,#58b8d9 0%,#6f69df 100%);">
                      <a href="${escapeHtml(params.verificationUrl)}" style="display:inline-block;padding:12px 30px;border-radius:10px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;">Confirm Email</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:14px;line-height:1.5;color:#d7e0ef;">If you have any questions, reply to <a href="mailto:${TO_SUPPORT_EMAIL}" style="color:#8fc8ff;text-decoration:none;">${TO_SUPPORT_EMAIL}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:11px 18px;border-top:1px solid #2b3a58;background:rgba(8,13,24,0.35);text-align:center;">
                <p style="margin:0;font-size:15px;color:#9fb2d3;">Smart Reply Pro</p>
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
    "- Context-Aware Assistance — Keep your message intent clear and aligned.",
    "",
    "Confirm Email:",
    params.verificationUrl,
    "",
    "If you have any questions, reply to support@smartreplypro.ai",
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
