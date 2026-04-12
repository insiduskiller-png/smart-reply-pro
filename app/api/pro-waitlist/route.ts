import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ResendEmailError, sendProWaitlistEmailToSupport } from "@/lib/pro-waitlist-email";
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceKey) {
    return false;
  }

  try {
    const parsed = new URL(supabaseUrl);
    return Boolean(parsed.protocol && parsed.host);
  } catch {
    return false;
  }
}

function getSupabaseEnvDiagnostics() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const hasSupabaseUrl = Boolean(rawUrl);
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  let hostname = "invalid";
  if (rawUrl) {
    try {
      hostname = new URL(rawUrl).hostname;
    } catch {
      hostname = "invalid";
    }
  }

  const looksPlaceholder =
    hostname === "example.supabase.co" ||
    hostname.endsWith(".example.com") ||
    hostname === "invalid";

  return {
    hasSupabaseUrl,
    hasServiceRoleKey,
    supabaseHostname: hostname,
    looksPlaceholder,
  };
}

function getRouteSupabaseService() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing waitlist Supabase service environment");
  }

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
    const envDiagnostics = getSupabaseEnvDiagnostics();
    logWaitlistEvent(requestId, "supabase-env-diagnostics", envDiagnostics);

    if (!hasRequiredWaitlistEnv()) {
      logWaitlistEvent(
        requestId,
        "env-misconfigured",
        envDiagnostics,
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

    let user: Awaited<ReturnType<typeof resolveAuthenticatedUser>> | null = null;
    try {
      user = await resolveAuthenticatedUser();
    } catch (authError) {
      logWaitlistEvent(
        requestId,
        "auth-context-unavailable",
        {
          message: authError instanceof Error ? authError.message : "Unknown auth context error",
        },
        "warn",
      );
    }

    let subscriptionStatus: string | null = null;
    if (user?.id) {
      try {
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
      } catch (profileError) {
        logWaitlistEvent(
          requestId,
          "profile-fetch-warning",
          {
            message: profileError instanceof Error ? profileError.message : "Unknown profile fetch error",
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
        const emailFromAddress =
          process.env.WAITLIST_FROM_EMAIL?.trim() || "Smart Reply Pro <no-reply@smartreplypro.ai>";
        logWaitlistEvent(requestId, "email-send-attempt", {
          provider: "resend",
          destination: "support@smartreplypro.ai",
          fromAddress: emailFromAddress,
          hasResendApiKey: Boolean(process.env.RESEND_API_KEY?.trim()),
          waitlistEntryId: result.id,
          waitlistEmail: result.email,
        });

        const emailResult = await sendProWaitlistEmailToSupport({
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
        logWaitlistEvent(requestId, "email-send-success", {
          provider: "resend",
          resendId: emailResult.resendId,
          destination: "support@smartreplypro.ai",
          waitlistEntryId: result.id,
        });
      } catch (emailError) {
        const isResendError = emailError instanceof ResendEmailError;
        logWaitlistEvent(
          requestId,
          "email-send-failure",
          {
            provider: "resend",
            hasResendApiKey: Boolean(process.env.RESEND_API_KEY?.trim()),
            message: emailError instanceof Error ? emailError.message : "Unknown email error",
            httpStatus: isResendError ? emailError.httpStatus : null,
            providerResponse: isResendError ? emailError.resendPayload : null,
            waitlistEntryId: result.id,
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
            success: true,
            saved: true,
            duplicate: false,
            message: "You’re on the Pro waitlist. We’ll notify you when access opens.",
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

      if (error.code === "WAITLIST_DB_UNAVAILABLE") {
        return jsonResponse(
          {
            success: false,
            saved: false,
            duplicate: false,
            message: "Waitlist storage is currently unavailable. Please try again shortly.",
            errorCode: "WAITLIST_DB_UNAVAILABLE",
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
