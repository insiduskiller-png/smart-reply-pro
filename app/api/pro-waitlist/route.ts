import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase";
import { sendProWaitlistEmailToSupport } from "@/lib/pro-waitlist-email";
import {
  createProWaitlistEntry,
  isValidWaitlistEmail,
  normalizeWaitlistEmail,
  ProWaitlistError,
  updateProWaitlistNotificationStatus,
} from "@/lib/pro-waitlist";

type WaitlistApiResponse = {
  success: boolean;
  saved: boolean;
  duplicate: boolean;
  message: string;
  errorCode?: string;
};

function jsonResponse(payload: WaitlistApiResponse, status: number) {
  return NextResponse.json(payload, { status });
}

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
      return jsonResponse(
        {
          success: false,
          saved: false,
          duplicate: false,
          message: "Email is required.",
          errorCode: "INVALID_EMAIL_EMPTY",
        },
        400,
      );
    }

    if (!isValidWaitlistEmail(email)) {
      return jsonResponse(
        {
          success: false,
          saved: false,
          duplicate: false,
          message: "Enter a valid email address.",
          errorCode: "INVALID_EMAIL_FORMAT",
        },
        400,
      );
    }

    if (note.length > 1000) {
      return jsonResponse(
        {
          success: false,
          saved: false,
          duplicate: false,
          message: "Note must be 1000 characters or fewer.",
          errorCode: "INVALID_NOTE_LENGTH",
        },
        400,
      );
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

        if (result.id) {
          await updateProWaitlistNotificationStatus({
            id: result.id,
            status: "sent",
          });
        }
      } catch (emailError) {
        console.error("Pro waitlist email notify error:", emailError);
        if (result.id) {
          await updateProWaitlistNotificationStatus({
            id: result.id,
            status: "failed",
            errorMessage: emailError instanceof Error ? emailError.message : "Unknown email error",
          });
        }

        return NextResponse.json(
          {
            success: false,
            saved: true,
            duplicate: false,
            message: "You’re on the Pro waitlist. We saved your request, but internal notification is delayed.",
            errorCode: "NOTIFICATION_DEFERRED",
          },
          { status: 202 },
        );
      }
    }

    return jsonResponse(
      {
        success: true,
        saved: true,
        duplicate: result.duplicate,
        message: result.message,
      },
      result.duplicate ? 200 : 201,
    );
  } catch (error) {
    if (error instanceof ProWaitlistError) {
      console.error("Pro waitlist API structured error:", {
        code: error.code,
        message: error.message,
        details: error.details,
      });

      if (error.code === "WAITLIST_TABLE_MISSING") {
        return jsonResponse(
          {
            success: false,
            saved: false,
            duplicate: false,
            message: "Waitlist storage is not ready yet. Please try again shortly.",
            errorCode: "WAITLIST_TABLE_MISSING",
          },
          503,
        );
      }

      return jsonResponse(
        {
          success: false,
          saved: false,
          duplicate: false,
          message: "We couldn’t save your waitlist request right now. Please try again.",
          errorCode: error.code,
        },
        500,
      );
    } else {
      console.error("Pro waitlist API error:", error);
    }

    return jsonResponse(
      {
        success: false,
        saved: false,
        duplicate: false,
        message: "We couldn’t save your waitlist request right now. Please try again.",
        errorCode: "WAITLIST_UNKNOWN_ERROR",
      },
      500,
    );
  }
}
