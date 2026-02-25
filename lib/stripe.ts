import crypto from "node:crypto";
import { getStripeCheckoutEnv, getStripeWebhookEnv } from "./env";

function stripeHeaders(secretKey: string) {
  return {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

export async function createCheckoutSession(params: {
  customerEmail: string;
  userId: string;
  baseUrl: string;
}) {
  const { stripeSecretKey, stripePriceId } = getStripeCheckoutEnv();
  const body = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": stripePriceId,
    "line_items[0][quantity]": "1",
    success_url: `${params.baseUrl}/dashboard?checkout=success`,
    cancel_url: `${params.baseUrl}/pricing?checkout=cancelled`,
    client_reference_id: params.userId,
    customer_email: params.customerEmail,
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: stripeHeaders(stripeSecretKey),
    body,
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Unable to create checkout session: ${payload}`);
  }

  return response.json();
}

export function verifyStripeSignature(payload: string, signature: string | null) {
  if (!signature) return false;
  const { stripeWebhookSecret } = getStripeWebhookEnv();
  const elements = Object.fromEntries(
    signature.split(",").map((pair) => pair.split("=") as [string, string]),
  );
  const signedPayload = `${elements.t}.${payload}`;
  const expected = crypto
    .createHmac("sha256", stripeWebhookSecret)
    .update(signedPayload)
    .digest("hex");
  return expected === elements.v1;
}
