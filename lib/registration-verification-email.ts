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
  <body style="margin:0;padding:0;background:#0b1220;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px;background:#0b1220;">
      <tr>
        <td align="center">
          <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;border:1px solid #1e293b;border-radius:18px;overflow:hidden;background:linear-gradient(180deg,#0f172a 0%,#111a2f 55%,#0f172a 100%);box-shadow:0 16px 60px rgba(2,6,23,0.45);">
            <tr>
              <td style="padding:0;background:linear-gradient(90deg,#141f3a 0%,#0f2241 45%,#14335f 100%);border-bottom:1px solid #2b3a58;">
                <div style="height:10px;background:linear-gradient(90deg,#ff9b54 0%,#8b7bff 52%,#54d1ff 100%);"></div>
                <div style="padding:24px 30px 20px;">
                  <div style="width:44px;height:44px;border-radius:999px;background:radial-gradient(circle at 32% 38%,#ffd58a 0%,#ff9b54 35%,#2b406b 100%);"></div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:38px 40px 34px;">
                <h1 style="margin:0 0 20px;font-size:40px;line-height:1.14;font-weight:700;color:#f8fafc;">${params.heading}</h1>
                <p style="margin:0 0 18px;font-size:23px;line-height:1.45;color:#e2e8f0;">${greetingName}</p>
                <p style="margin:0 0 16px;font-size:23px;line-height:1.45;color:#d5deec;">Thanks for creating your account. Confirm your email to continue and unlock your workspace.</p>
                <p style="margin:0 0 22px;font-size:23px;line-height:1.45;color:#d5deec;">Top benefits of your free plan:</p>
                <ul style="margin:0 0 28px 24px;padding:0;color:#d5deec;font-size:22px;line-height:1.45;">
                  <li style="margin:0 0 8px;"><strong style="color:#f8fafc;">Human-Like Replies</strong> — Generate natural, context-aware responses that sound real.</li>
                  <li style="margin:0 0 8px;"><strong style="color:#f8fafc;">Customizable Responses</strong> — Tailor replies to your voice and communication style.</li>
                  <li style="margin:0;"><strong style="color:#f8fafc;">Context-Aware Assistance</strong> — Keep your message intent clear and on-brand.</li>
                </ul>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:10px;background:linear-gradient(90deg,#58b8d9 0%,#6f69df 100%);">
                      <a href="${escapeHtml(params.verificationUrl)}" style="display:inline-block;padding:14px 34px;border-radius:10px;color:#ffffff;font-size:22px;font-weight:700;text-decoration:none;">Confirm Email</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:22px;line-height:1.45;color:#d5deec;">If you have any questions, reply to <a href="mailto:${TO_SUPPORT_EMAIL}" style="color:#8fc8ff;text-decoration:none;">${TO_SUPPORT_EMAIL}</a>.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 30px;border-top:1px solid #2b3a58;background:rgba(8,13,24,0.35);text-align:center;">
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
    "Thanks for creating your account. Confirm your email to continue and unlock your workspace.",
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
