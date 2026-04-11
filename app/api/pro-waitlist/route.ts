import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";
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
  console.info("[pro-waitlist]", {
    stage: "response",
    status,
    payload,
  });
  return NextResponse.json(payload, { status });
}

function logWaitlistEvent(
  requestId: string,
  stage: string,
  details: Record<string, unknown>,
  level: "info" | "warn" | "error" = "info",
) {
  const logger = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  logger("[pro-waitlist]", {
    requestId,
    stage,
    ...details,
  });
}

function hasRequiredWaitlistEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

function getRouteSupabaseService() {
  const { supabaseUrl, supabaseServiceKey } = getSupabaseEnv();
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function resolveAuthenticatedUser() {
  const authModule = await import("@/lib/auth");
  return authModule.requireUser();
}

export async function POST(request: Request) {
  const requestId =
    request.headers.get("x-vercel-id") ||
    request.headers.get("x-request-id") ||
    crypto.randomUUID();

  try {
    if (!hasRequiredWaitlistEnv()) {
      logWaitlistEvent(
        requestId,
        "env-misconfigured",
        {
          hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
          hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
        },
        "error",
      );
      return jsonResponse(
        {
          success: false,
          saved: false,
          duplicate: false,
          message: "Waitlist storage is not ready yet. Please try again shortly.",
          errorCode: "WAITLIST_ENV_MISSING",
        },
        503,
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? normalizeWaitlistEmail(body.email) : "";
    const note = typeof body.note === "string" ? body.note : "";
    const sourcePage = typeof body.sourcePage === "string" ? body.sourcePage : "unknown";
    logWaitlistEvent(requestId, "incoming-payload", {
      email,
      noteLength: note.length,
      sourcePage,
    });
    logWaitlistEvent(requestId, "request-received", {
      hasEmail: Boolean(email),
      noteLength: note.length,
      sourcePage,
    });

    const user = await resolveAuthenticatedUser();

    let subscriptionStatus: string | null = null;
    if (user?.id) {
      const supabaseService = getRouteSupabaseService();
      const profile = await supabaseService
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile.error && profile.data?.subscription_status) {
        subscriptionStatus = String(profile.data.subscription_status);
      } else if (profile.error) {
        logWaitlistEvent(
          requestId,
          "profile-fetch-warning",
          {
            code: profile.error.code,
            message: profile.error.message,
          },
          "warn",
        );
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

    logWaitlistEvent(requestId, "db-insert-attempt", {
      email,
      sourcePage,
      hasUserId: Boolean(user?.id),
      subscriptionStatus,
    });

    const result = await createProWaitlistEntry({
      email,
      note,
      sourcePage,
      userId: user?.id ?? null,
      subscriptionStatus,
    });

    logWaitlistEvent(requestId, "db-insert-result", {
      id: result.id,
      duplicate: result.duplicate,
      createdAt: result.createdAt,
      notificationStatus: result.notificationStatus,
    });

    logWaitlistEvent(requestId, "waitlist-saved", {
      id: result.id,
      duplicate: result.duplicate,
      notificationStatus: result.notificationStatus,
      sourcePage: result.sourcePage,
      hasUserId: Boolean(result.userId),
    });

    if (!result.duplicate) {
      try {
        logWaitlistEvent(requestId, "email-send-attempt", {
          destination: "support@smartreplypro.ai",
          waitlistEntryId: result.id,
          waitlistEmail: result.email,
        });

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
        logWaitlistEvent(requestId, "email-send-result", {
          id: result.id,
          success: true,
          destination: "support@smartreplypro.ai",
        });
      } catch (emailError) {
        logWaitlistEvent(
          requestId,
          "email-send-result",
          {
            id: result.id,
            success: false,
            message: emailError instanceof Error ? emailError.message : "Unknown email error",
          },
          "error",
        );
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
      logWaitlistEvent(requestId, "waitlist-structured-error", {
        code: error.code,
        message: error.message,
        details: error.details,
      }, "error");

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

      if (error.code === "WAITLIST_ENV_MISSING") {
        return jsonResponse(
          {
            success: false,
            saved: false,
            duplicate: false,
            message: "Waitlist storage is not ready yet. Please try again shortly.",
            errorCode: "WAITLIST_ENV_MISSING",
          },
          503,
        );
      }

      if (error.code === "WAITLIST_PERMISSION_DENIED") {
        return jsonResponse(
          {
            success: false,
            saved: false,
            duplicate: false,
            message: "Waitlist storage is currently unavailable. Please try again shortly.",
            errorCode: "WAITLIST_PERMISSION_DENIED",
          },
          503,
        );
      }

      if (error.code === "WAITLIST_SERVICE_AUTH_FAILED") {
        return jsonResponse(
          {
            success: false,
            saved: false,
            duplicate: false,
            message: "Waitlist storage is currently unavailable. Please try again shortly.",
            errorCode: "WAITLIST_SERVICE_AUTH_FAILED",
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
      logWaitlistEvent(
        requestId,
        "waitlist-unstructured-error",
        {
          message: error instanceof Error ? error.message : "Unknown error",
        },
        "error",
      );
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
