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
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:20px 10px;background:#111827;">
      <tr>
        <td align="center">
          <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;border:1px solid #223047;border-radius:16px;overflow:hidden;background:linear-gradient(180deg,#0f172a 0%,#121d34 55%,#0f172a 100%);box-shadow:0 12px 38px rgba(2,6,23,0.4);">
            <tr>
              <td style="padding:0;background:linear-gradient(90deg,#131d34 0%,#112642 52%,#14365f 100%);border-bottom:1px solid #2b3a58;">
                <div style="height:10px;background:linear-gradient(90deg,#ff9b54 0%,#8b7bff 52%,#54d1ff 100%);"></div>
                <div style="padding:18px 24px 16px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:middle;">
                        <div style="width:34px;height:34px;border-radius:999px;background:radial-gradient(circle at 32% 38%,#ffd58a 0%,#ff9b54 35%,#2b406b 100%);"></div>
                      </td>
                      <td style="vertical-align:middle;padding-left:12px;">
                        <p style="margin:0;font-size:17px;line-height:1.1;font-weight:700;color:#f8fafc;letter-spacing:-0.02em;">Smart Reply Pro</p>
                      </td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 24px;">
                <h1 style="margin:0 0 14px;font-size:42px;line-height:1.12;font-weight:700;color:#f8fafc;letter-spacing:-0.02em;">${params.heading}</h1>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.4;color:#e2e8f0;font-weight:500;">${greetingName}</p>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.5;color:#d7e0ef;">Thank you for signing up for Smart Reply Pro. Please confirm your email address to activate your account and continue using the platform.</p>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.5;color:#d7e0ef;">Top Key Benefits of Smart Reply Pro are:</p>
                <ul style="margin:0 0 18px 22px;padding:0;color:#d7e0ef;font-size:15px;line-height:1.55;">
                  <li style="margin:0 0 6px;"><strong style="color:#f8fafc;">Human-Like Replies</strong> — Generate natural, context-aware responses that sound real.</li>
                  <li style="margin:0 0 6px;"><strong style="color:#f8fafc;">Customizable Responses</strong> — Tailor your responses to fit your unique style and tone.</li>
                  <li style="margin:0;"><strong style="color:#f8fafc;">Context-Aware Assistance</strong> — Keep your message intent clear and aligned.</li>
                </ul>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 14px;">
                  <tr>
                    <td style="border-radius:10px;background:linear-gradient(90deg,#58b8d9 0%,#6f69df 100%);">
                      <a href="${escapeHtml(params.verificationUrl)}" style="display:inline-block;padding:12px 30px;border-radius:10px;color:#ffffff;font-size:17px;font-weight:700;text-decoration:none;">Confirm Email</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:15px;line-height:1.5;color:#d7e0ef;">If you have any questions, reply to <a href="mailto:${TO_SUPPORT_EMAIL}" style="color:#8fc8ff;text-decoration:none;">${TO_SUPPORT_EMAIL}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 20px;border-top:1px solid #2b3a58;background:rgba(8,13,24,0.35);text-align:center;">
                <p style="margin:0;font-size:16px;color:#9fb2d3;">Smart Reply Pro</p>
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
