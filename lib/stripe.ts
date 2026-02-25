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
import { getStripeEnv } from "./env";

function stripeHeaders() {
  const { stripeSecretKey } = getStripeEnv();
import { getEnv } from "./env";

function stripeHeaders() {
  const { stripeSecretKey } = getEnv();
  return { Authorization: `Bearer ${stripeSecretKey}`, "Content-Type": "application/x-www-form-urlencoded" };
}

export async function createCheckoutSession(customerEmail: string, userId: string) {
  const { stripePriceId, appUrl } = getStripeEnv();
  const { stripePriceId, appUrl } = getEnv();
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
  const { stripeWebhookSecret } = getStripeWebhookEnv();
  const elements = Object.fromEntries(
    signature.split(",").map((pair) => pair.split("=") as [string, string]),
  );
  const signedPayload = `${elements.t}.${payload}`;
  const expected = crypto
    .createHmac("sha256", stripeWebhookSecret)
    .update(signedPayload)
    .digest("hex");
  const { stripeWebhookSecret } = getStripeEnv();
  const { stripeWebhookSecret } = getEnv();
  const elements = Object.fromEntries(signature.split(",").map((pair) => pair.split("=") as [string, string]));
  const signedPayload = `${elements.t}.${payload}`;
  const expected = crypto.createHmac("sha256", stripeWebhookSecret).update(signedPayload).digest("hex");
  return expected === elements.v1;
}
