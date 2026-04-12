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
                              <img src="data:image/png;base64,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" width="40" height="30" alt="Smart Reply Pro logo" style="display:block;border:0;" />
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
