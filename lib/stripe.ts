import crypto from "node:crypto";
import { getStripeEnv } from "./env";

function stripeHeaders() {
  const { stripeSecretKey } = getStripeEnv();
  return { Authorization: `Bearer ${stripeSecretKey}`, "Content-Type": "application/x-www-form-urlencoded" };
}

export async function createCheckoutSession(customerEmail: string, userId: string) {
  const { stripePriceId, appUrl } = getStripeEnv();
  const body = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": stripePriceId,
    "line_items[0][quantity]": "1",
    success_url: `${appUrl}/dashboard?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=cancelled`,
    client_reference_id: userId,
    customer_email: customerEmail,
  });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: stripeHeaders(), body });
  if (!response.ok) throw new Error("Unable to create checkout session");
  return response.json();
}

export function verifyStripeSignature(payload: string, signature: string | null) {
  if (!signature) return false;
  const { stripeWebhookSecret } = getStripeEnv();
  const elements = Object.fromEntries(signature.split(",").map((pair) => pair.split("=") as [string, string]));
  const signedPayload = `${elements.t}.${payload}`;
  const expected = crypto.createHmac("sha256", stripeWebhookSecret).update(signedPayload).digest("hex");
  return expected === elements.v1;
}
