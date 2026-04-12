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
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:22px 12px;background:#f4f4f5;">
      <tr>
        <td align="center">
          <table role="presentation" width="704" cellpadding="0" cellspacing="0" style="max-width:704px;width:100%;border:1px solid #dddfe4;border-radius:22px;background:#f8f8f8;box-shadow:0 10px 26px rgba(15,23,42,0.10);padding:14px;">
            <tr>
              <td>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #d9deea;border-radius:20px;overflow:hidden;background:#101827;background-image:radial-gradient(circle at 12% 8%,rgba(255,213,138,0.08),transparent 20%),radial-gradient(circle at 80% 88%,rgba(167,139,250,0.08),transparent 22%),radial-gradient(circle at 50% 60%,rgba(255,255,255,0.03),transparent 35%);">
                  <tr>
                    <td style="padding:0;background:linear-gradient(90deg,#121c31 0%,#11243d 52%,#13365d 100%);border-bottom:1px solid #2b3a58;">
                      <div style="padding:18px 22px 16px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                          <tr>
                            <td style="vertical-align:middle;">
                              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Smart Reply Pro logo">
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
                              <span style="font-size:18px;line-height:1.1;font-weight:700;color:#F8FAFC;letter-spacing:-0.02em;">Smart Reply </span>
                              <span style="font-size:18px;line-height:1.1;font-weight:700;color:#74C6FF;letter-spacing:-0.02em;">Pro</span>
                            </td>
                          </tr>
                        </table>
                      </div>
                      <div style="height:3px;background:linear-gradient(90deg,#ff9b54 0%,#8b7bff 52%,#54d1ff 100%);"></div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:34px 28px 24px;background-image:radial-gradient(circle at 20% 18%,rgba(255,255,255,0.03),transparent 20%),radial-gradient(circle at 78% 74%,rgba(255,255,255,0.03),transparent 22%);">
                      <h1 style="margin:0 0 20px;font-size:26px;line-height:1.24;font-weight:700;color:#f8fafc;letter-spacing:-0.02em;">${headingMarkup}</h1>
                      <p style="margin:0 0 20px;font-size:15px;line-height:1.45;color:#f1f5f9;font-weight:500;">${greetingName}</p>
                      <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#d7e0ef;max-width:530px;">Thank you for signing up for Smart Reply Pro! We’re excited to have you on board.</p>
                      <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#d7e0ef;max-width:530px;">Get ready to enhance your productivity and streamline your communications with our intelligent AI-powered reply generator.</p>
                      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#d7e0ef;max-width:530px;"><strong><em>Top Key Benefits of Smart Reply Pro are:</em></strong></p>
                      <ul style="margin:0 0 20px 24px;padding:0;color:#d7e0ef;font-size:15px;line-height:1.62;max-width:560px;">
                        <li style="margin:0 0 6px;"><strong style="color:#f8fafc;">Human-Like Replies</strong> — Generate natural, context-aware responses that sound real.</li>
                        <li style="margin:0 0 6px;"><strong style="color:#f8fafc;">Customizable Responses</strong> Tailor your responses to fit your unique style and tone.</li>
                        <li style="margin:0;"><strong style="color:#f8fafc;">Advanced AI Technology</strong> Powered by cutting-edge AI, Smart Reply Pro learns and adapts to your communication style to provide accurate and context-aware suggestions.</li>
                      </ul>
                      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 18px;">
                        <tr>
                          <td style="border-radius:8px;background:linear-gradient(90deg,#58b8d9 0%,#6f69df 100%);">
                            <a href="${escapeHtml(params.verificationUrl)}" style="display:inline-block;padding:12px 34px;border-radius:8px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;min-width:120px;text-align:center;">Confirm Email</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#d7e0ef;max-width:530px;">If you have any questions or need assistance, feel free to reach out to us.</p>
                      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#d7e0ef;max-width:530px;">Happy replying!</p>
                      <p style="margin:0;font-size:15px;line-height:1.6;color:#8fc8ff;max-width:530px;">The Smart Reply Pro Team</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px;border-top:1px solid #2b3a58;background:rgba(8,13,24,0.42);text-align:center;">
                      <p style="margin:0;font-size:13px;line-height:1.5;color:#d7e0ef;">Need help? Contact us at <a href="mailto:support@smartreplypro.ai" style="color:#8fc8ff;text-decoration:none;">support@smartreplypro.ai</a></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px 10px;border-top:1px solid rgba(43,58,88,0.6);background:rgba(8,13,24,0.52);text-align:center;">
                      <div style="margin:0 auto 16px;width:max-content;">
                        <span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background:rgba(159,178,211,0.18);color:#9fb2d3;font-size:14px;margin:0 6px;">t</span>
                        <span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background:rgba(159,178,211,0.18);color:#9fb2d3;font-size:14px;margin:0 6px;">f</span>
                        <span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background:rgba(159,178,211,0.18);color:#9fb2d3;font-size:14px;margin:0 6px;">in</span>
                      </div>
                      <p style="margin:0 0 10px;font-size:13px;color:#b8c3d8;">&nbsp;</p>
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
    "Thank you for signing up for Smart Reply Pro! We’re excited to have you on board.",
    "",
    "Get ready to enhance your productivity and streamline your communications with our intelligent AI-powered reply generator.",
    "",
    "Top Key Benefits of Smart Reply Pro are:",
    "- Human-Like Replies — Generate natural, context-aware responses that sound real.",
    "- Customizable Responses Tailor your responses to fit your unique style and tone.",
    "- Advanced AI Technology Powered by cutting-edge AI, Smart Reply Pro learns and adapts to your communication style to provide accurate and context-aware suggestions.",
    "",
    "Confirm Email:",
    params.verificationUrl,
    "",
    "Need help? Contact us at support@smartreplypro.ai",
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
