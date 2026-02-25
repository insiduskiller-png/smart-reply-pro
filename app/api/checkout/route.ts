import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/env";

export async function POST() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to upgrade." }, { status: 401 });
  }

  try {
    const baseUrl = getSiteUrl();
    const session = await createCheckoutSession({
      customerEmail: user.email,
      userId: user.id,
      baseUrl,
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
