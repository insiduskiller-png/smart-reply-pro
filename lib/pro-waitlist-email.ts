type SendProWaitlistEmailInput = {
  timestampIso: string;
  waitlistEmail: string;
  userId?: string | null;
  accountEmail?: string | null;
  subscriptionStatus?: string | null;
  sourcePage: string;
  note?: string | null;
  waitlistEntryId?: string | null;
};

const SUPPORT_EMAIL = "support@smartreplypro.ai";

function requireResendApiKey() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }
  return apiKey;
}

function getEmailFromAddress() {
  return process.env.WAITLIST_FROM_EMAIL?.trim() || "Smart Reply Pro <no-reply@smartreplypro.ai>";
}

export async function sendProWaitlistEmailToSupport(input: SendProWaitlistEmailInput) {
  const apiKey = requireResendApiKey();

  const subject = `Pro waitlist submission • ${input.waitlistEmail}`;
  const text = [
    "New Pro waitlist submission",
    "",
    `Timestamp: ${input.timestampIso}`,
    `Waitlist email: ${input.waitlistEmail}`,
    `User account id: ${input.userId ?? "not available"}`,
    `User account email: ${input.accountEmail ?? "not available"}`,
    `Current plan/status: ${input.subscriptionStatus ?? "not available"}`,
    `Source page: ${input.sourcePage}`,
    `Waitlist entry id: ${input.waitlistEntryId ?? "not available"}`,
    `Optional note: ${input.note?.trim() ? input.note.trim() : "none"}`,
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getEmailFromAddress(),
      to: [SUPPORT_EMAIL],
      subject,
      text,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.message || payload?.error || "Failed to send support notification email";
    throw new Error(message);
  }
}
