import { NextResponse } from "next/server";
import { patchUserProfile } from "@/lib/supabase";
import { verifyStripeSignature } from "@/lib/stripe";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!verifyStripeSignature(payload, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(payload);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.client_reference_id) {
      await patchUserProfile(session.client_reference_id, {
        stripe_customer_id: session.customer,
        subscription_status: "pro",
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    await patchUserProfile(subscription.metadata.user_id, { subscription_status: "canceled" });
  }

  return NextResponse.json({ received: true });
}
