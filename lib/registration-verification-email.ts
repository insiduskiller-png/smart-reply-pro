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
                              <svg width="56" height="34" viewBox="0 0 56 34" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Smart Reply Pro logo">
                                <path d="M8 17C8 10.9249 12.9249 6 19 6H37C43.0751 6 48 10.9249 48 17C48 23.0751 43.0751 28 37 28H19C12.9249 28 8 23.0751 8 17Z" fill="url(#srpMonoGlow)"/>
                                <path d="M17 12.3H31.8C34.2 12.3 36 13.8 36 16C36 18.4 34.2 19.7 31.8 19.7H23.6C22.9 19.7 22.4 20.1 22.4 20.7C22.4 21.4 23 21.7 23.6 21.7H35.2V24.2H22.8C20.2 24.2 18.6 22.8 18.6 20.8C18.6 18.8 20.3 17.4 22.8 17.4H31.5C32.4 17.4 33 17 33 16.2C33 15.4 32.4 14.9 31.5 14.9H17V12.3Z" fill="#0B1330"/>
                                <path d="M36.8 12.3H43.8C46.5 12.3 48 13.5 48 15.9C48 17.3 47.4 18.3 46.1 18.9L48.5 24.2H44.8L42.9 19.8H40V24.2H36.8V12.3ZM40 14.9V17.3H43.3C44.1 17.3 44.7 16.9 44.7 16.1C44.7 15.3 44.1 14.9 43.3 14.9H40Z" fill="#0B1330"/>
                                <defs>
                                  <linearGradient id="srpMonoGlow" x1="8" y1="6" x2="48" y2="28" gradientUnits="userSpaceOnUse">
                                    <stop stop-color="#4FB3FF"/>
                                    <stop offset="1" stop-color="#9FE870"/>
                                  </linearGradient>
                                </defs>
                              </svg>
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
                    <td style="padding:24px 26px 14px;background-image:radial-gradient(circle at 20% 18%,rgba(255,255,255,0.03),transparent 20%),radial-gradient(circle at 78% 74%,rgba(255,255,255,0.03),transparent 22%);">
                      <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;font-weight:700;color:#f8fafc;letter-spacing:-0.02em;">${headingMarkup}</h1>
                      <p style="margin:0 0 14px;font-size:16px;line-height:1.4;color:#f1f5f9;font-weight:500;">${greetingName}</p>
                      <p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#d7e0ef;max-width:530px;">Thank you for signing up for Smart Reply Pro. Please confirm your email address to activate your account and continue using the platform.</p>
                      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
                        <tr>
                          <td style="border-radius:8px;background:linear-gradient(90deg,#58b8d9 0%,#6f69df 100%);">
                            <a href="${escapeHtml(params.verificationUrl)}" style="display:inline-block;padding:12px 34px;border-radius:8px;color:#ffffff;font-size:16px;line-height:1.06;font-weight:700;text-decoration:none;min-width:0;text-align:center;">Confirm Email</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-top:1px solid #2b3a58;background:rgba(8,13,24,0.42);text-align:center;">
                      <p style="margin:0;font-size:13px;line-height:1.5;color:#d7e0ef;">If you have any questions, reply to <a href="mailto:support@smartreplypro.ai" style="color:#8fc8ff;text-decoration:none;">support@smartreplypro.ai</a></p>
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
    "Confirm Email:",
    params.verificationUrl,
    "",
    "If you have any questions, reply to support@smartreplypro.ai",
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
