import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/stripe";
import { PRO_PLAN_ACTIVE } from "@/lib/billing";

export async function POST(request: Request) {
  if (!PRO_PLAN_ACTIVE) {
    return NextResponse.json(
      { error: "Pro checkout will be available when the Pro tier launches." },
      { status: 409 },
    );
  }

  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to upgrade." }, { status: 401 });
  }

  if (!user.email) {
    return NextResponse.json({ error: "Email required to create subscription." }, { status: 400 });
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
}
