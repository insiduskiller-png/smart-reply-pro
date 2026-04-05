import { NextResponse } from "next/server";
import { createProWaitlistEntry, isValidWaitlistEmail, normalizeWaitlistEmail } from "@/lib/pro-waitlist";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? normalizeWaitlistEmail(body.email) : "";
    const note = typeof body.note === "string" ? body.note : "";
    const sourcePage = typeof body.sourcePage === "string" ? body.sourcePage : "unknown";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (!isValidWaitlistEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (note.length > 1000) {
      return NextResponse.json({ error: "Note must be 1000 characters or fewer." }, { status: 400 });
    }

    const result = await createProWaitlistEntry({
      email,
      note,
      sourcePage,
    });

    return NextResponse.json(
      {
        success: true,
        duplicate: result.duplicate,
        message: result.message,
      },
      { status: result.duplicate ? 200 : 201 },
    );
  } catch (error) {
    console.error("Pro waitlist API error:", error);
    return NextResponse.json(
      { error: "We couldn’t save your waitlist request right now. Please try again." },
      { status: 500 },
    );
  }
}
