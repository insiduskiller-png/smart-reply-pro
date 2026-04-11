import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase";
import { sendProWaitlistEmailToSupport } from "@/lib/pro-waitlist-email";
import {
  createProWaitlistEntry,
  deleteProWaitlistEntryById,
  isValidWaitlistEmail,
  normalizeWaitlistEmail,
} from "@/lib/pro-waitlist";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? normalizeWaitlistEmail(body.email) : "";
    const note = typeof body.note === "string" ? body.note : "";
    const sourcePage = typeof body.sourcePage === "string" ? body.sourcePage : "unknown";
    const user = await requireUser();

    let subscriptionStatus: string | null = null;
    if (user?.id) {
      const profile = await supabaseService
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile.error && profile.data?.subscription_status) {
        subscriptionStatus = String(profile.data.subscription_status);
      }
    }

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
      userId: user?.id ?? null,
      subscriptionStatus,
    });

    if (!result.duplicate) {
      try {
        await sendProWaitlistEmailToSupport({
          timestampIso: result.createdAt,
          waitlistEmail: result.email,
          userId: result.userId,
          accountEmail: user?.email ?? null,
          subscriptionStatus: result.subscriptionStatus,
          sourcePage: result.sourcePage,
          note: result.note,
          waitlistEntryId: result.id,
        });
      } catch (emailError) {
        if (result.id) {
          await deleteProWaitlistEntryById(result.id);
        }
        console.error("Pro waitlist email notify error:", emailError);
        return NextResponse.json(
          { error: "We couldn’t submit your waitlist request right now. Please try again." },
          { status: 502 },
        );
      }
    }

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
