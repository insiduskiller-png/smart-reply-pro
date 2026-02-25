import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/stripe";

export async function POST(request: Request) {
export async function POST() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to upgrade." }, { status: 401 });
  }

  try {
    const origin = new URL(request.url).origin;
    const session = await createCheckoutSession({
      customerEmail: user.email,
      userId: user.id,
      baseUrl: origin,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 500 },
      );
    }

    const session = await createCheckoutSession(user.email, user.id);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create checkout session right now.",
      },
      { status: 500 },
    );
  }
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await createCheckoutSession(user.email, user.id);
  return NextResponse.json({ url: session.url });
}
