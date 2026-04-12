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
                                <circle cx="41" cy="17" r="15" fill="#1A2A49"/>
                                <ellipse cx="27" cy="17" rx="22" ry="7.5" fill="url(#srpTrail)"/>
                                <circle cx="42" cy="17" r="10.5" fill="url(#srpCore)"/>
                                <circle cx="15.2" cy="23.8" r="2.8" fill="#6D86C2"/>
                                <circle cx="9.2" cy="23.8" r="1.7" fill="#A1B3DA"/>
                                <defs>
                                  <linearGradient id="srpTrail" x1="5" y1="17" x2="37" y2="17" gradientUnits="userSpaceOnUse">
                                    <stop stop-color="#F08A49" stop-opacity="0"/>
                                    <stop offset="0.35" stop-color="#F08A49" stop-opacity="0.5"/>
                                    <stop offset="1" stop-color="#FFC27D" stop-opacity="0.95"/>
                                  </linearGradient>
                                  <radialGradient id="srpCore" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(39 14) rotate(45) scale(15)">
                                    <stop stop-color="#FFE3A6"/>
                                    <stop offset="0.55" stop-color="#FFC37C"/>
                                    <stop offset="1" stop-color="#E98349"/>
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
                      <p style="margin:0 0 10px;font-size:15px;line-height:1.55;color:#d7e0ef;max-width:530px;">Thank you for signing up for <strong style="color:#f8fafc;">Smart Reply Pro!</strong> We’re excited to have you on board.</p>
                      <p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#d7e0ef;max-width:530px;">Get ready to enhance your productivity and streamline your communications with our intelligent AI-powered reply generator.</p>
                      <p style="margin:0 0 10px;font-size:15px;line-height:1.55;color:#d7e0ef;max-width:530px;"><strong><em>Top Key Benefits of Smart Reply Pro are:</em></strong></p>
                      <ul style="margin:0 0 14px 28px;padding:0;color:#d7e0ef;font-size:15px;line-height:1.5;max-width:560px;">
                        <li style="margin:0 0 6px;"><strong style="color:#f8fafc;">Lightning-Fast Replies ⚡</strong> Generate smart and relevant replies in seconds.</li>
                        <li style="margin:0 0 6px;"><strong style="color:#f8fafc;">Customizable Responses 🎨</strong> Tailor your responses to fit your unique style and tone.</li>
                        <li style="margin:0;"><strong style="color:#f8fafc;">Advanced AI Technology 🤖</strong> Powered by cutting-edge AI, Smart Reply Pro learns and adapts to your communication style to provide accurate and context-aware suggestions.</li>
                      </ul>
                      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
                        <tr>
                          <td style="border-radius:8px;background:linear-gradient(90deg,#58b8d9 0%,#6f69df 100%);">
                            <a href="${escapeHtml(params.verificationUrl)}" style="display:inline-block;padding:12px 34px;border-radius:8px;color:#ffffff;font-size:16px;line-height:1.06;font-weight:700;text-decoration:none;min-width:0;text-align:center;">Get Started</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:0 0 10px;font-size:15px;line-height:1.55;color:#d7e0ef;max-width:530px;">If you have any questions or need assistance, feel free to reach out to us.</p>
                      <p style="margin:0 0 10px;font-size:15px;line-height:1.55;color:#d7e0ef;max-width:530px;">Happy replying!</p>
                      <p style="margin:0;font-size:15px;line-height:1.6;color:#8fc8ff;max-width:530px;">The Smart Reply Pro Team</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px;border-top:1px solid #2b3a58;background:rgba(8,13,24,0.42);text-align:center;">
                      <p style="margin:0;font-size:13px;line-height:1.5;color:#d7e0ef;">Need help? Contact us at <a href="mailto:support@smartreplypro.ai" style="color:#8fc8ff;text-decoration:none;">support@smartreplypro.ai</a></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px 12px;border-top:1px solid rgba(43,58,88,0.6);background:rgba(8,13,24,0.52);text-align:center;">
                      <div style="margin:0 auto 10px;width:max-content;">
                        <span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border-radius:50%;background:rgba(159,178,211,0.18);color:#9fb2d3;font-size:13px;margin:0 6px;">t</span>
                        <span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border-radius:50%;background:rgba(159,178,211,0.18);color:#9fb2d3;font-size:13px;margin:0 6px;">f</span>
                        <span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border-radius:50%;background:rgba(159,178,211,0.18);color:#9fb2d3;font-size:13px;margin:0 6px;">in</span>
                      </div>
                      <p style="margin:0 0 8px;font-size:11px;line-height:1.45;color:#b8c3d8;">Smart Reply Pro &nbsp;•&nbsp; 123 Business Center Road &nbsp;•&nbsp; Suite 100 &nbsp;•&nbsp; City, State, 12345</p>
                      <p style="margin:0;font-size:10px;line-height:1.4;color:#8e9ab2;">You received this email because you signed up at Smart Reply Pro. If you no longer wish to receive emails here.</p>
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
