import { NextResponse } from "next/server";
import {
  patchUserProfile,
  patchUserProfileByStripeCustomerId,
} from "@/lib/supabase";
import { verifyStripeSignature } from "@/lib/stripe";

type StripeEvent = {
  type: string;
  data: { object: Record<string, unknown> };
};

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!verifyStripeSignature(payload, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = typeof session.client_reference_id === "string" ? session.client_reference_id : "";
    const customerId = typeof session.customer === "string" ? session.customer : "";

    if (userId) {
      await patchUserProfile(userId, {
        subscription_status: "pro",
        ...(customerId ? { stripe_customer_id: customerId } : {}),
      });
    }
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object;
    const stripeStatus = typeof subscription.status === "string" ? subscription.status : "";
    const metadata = (subscription.metadata ?? {}) as Record<string, unknown>;
    const userId = typeof metadata.user_id === "string" ? metadata.user_id : "";
    const customerId = typeof subscription.customer === "string" ? subscription.customer : "";

    // Map Stripe subscription statuses to app subscription statuses.
    // "active" and "trialing" are the only states that grant Pro access.
    // "past_due", "unpaid", "canceled", "paused", "incomplete", "incomplete_expired" all revoke Pro.
    const newStatus = stripeStatus === "active" || stripeStatus === "trialing" ? "pro" : "free";

    if (userId) {
      await patchUserProfile(userId, { subscription_status: newStatus });
    } else if (customerId) {
      await patchUserProfileByStripeCustomerId(customerId, { subscription_status: newStatus });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const metadata = (subscription.metadata ?? {}) as Record<string, unknown>;
    const userId = typeof metadata.user_id === "string" ? metadata.user_id : "";
    const customerId = typeof subscription.customer === "string" ? subscription.customer : "";

    if (userId) {
      await patchUserProfile(userId, { subscription_status: "free" });
    } else if (customerId) {
      await patchUserProfileByStripeCustomerId(customerId, { subscription_status: "free" });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
