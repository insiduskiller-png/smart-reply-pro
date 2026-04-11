import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CreateProWaitlistEntryInput = {
  email: string;
  note?: string | null;
  sourcePage?: string | null;
  userId?: string | null;
  subscriptionStatus?: string | null;
};

export type ProWaitlistEntryResult = {
  success: true;
  duplicate: boolean;
  id: string | null;
  email: string;
  note: string | null;
  sourcePage: string;
  userId: string | null;
  subscriptionStatus: string | null;
  createdAt: string;
  notificationStatus: "pending" | "sent" | "failed";
  message: string;
};

export class ProWaitlistError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ProWaitlistError";
    this.code = code;
    this.details = details;
  }
}

function getWaitlistSupabaseService() {
  try {
    const { supabaseUrl, supabaseServiceKey } = getSupabaseEnv();
    return createClient(supabaseUrl, supabaseServiceKey);
  } catch (error) {
    throw new ProWaitlistError(
      "WAITLIST_ENV_MISSING",
      "Supabase environment is not configured for waitlist operations",
      error instanceof Error ? { message: error.message } : error,
    );
  }
}

function classifySupabaseWaitlistError(error: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
}) {
  const code = String(error.code ?? "");
  const combined = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();

  if (code === "42P01" || combined.includes("relation") && combined.includes("does not exist")) {
    return "WAITLIST_TABLE_MISSING";
  }

  if (code === "42501" || combined.includes("row-level security") || combined.includes("permission denied")) {
    return "WAITLIST_PERMISSION_DENIED";
  }

  if (combined.includes("invalid api key") || combined.includes("invalid jwt") || combined.includes("apikey")) {
    return "WAITLIST_SERVICE_AUTH_FAILED";
  }

  return "WAITLIST_INSERT_FAILED";
}

export function normalizeWaitlistEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidWaitlistEmail(email: string) {
  return EMAIL_REGEX.test(normalizeWaitlistEmail(email));
}

function sanitizeSourcePage(sourcePage?: string | null) {
  const value = sourcePage?.trim();

  if (!value) {
    return "unknown";
  }

  const normalized = value.startsWith("/") ? value : `/${value.replace(/^\/+/, "")}`;
  return normalized.slice(0, 120);
}

function sanitizeNote(note?: string | null) {
  const value = note?.trim();
  if (!value) {
    return null;
  }

  return value.slice(0, 1000);
}

function sanitizeSubscriptionStatus(value?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  return normalized.slice(0, 40);
}

export async function createProWaitlistEntry(input: CreateProWaitlistEntryInput) {
  const supabaseService = getWaitlistSupabaseService();
  const email = normalizeWaitlistEmail(input.email);
  const note = sanitizeNote(input.note);
  const sourcePage = sanitizeSourcePage(input.sourcePage);
  const userId = input.userId?.trim() || null;
  const subscriptionStatus = sanitizeSubscriptionStatus(input.subscriptionStatus);

  const existing = await supabaseService
    .from("pro_waitlist")
    .select("id, created_at")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    console.error("pro waitlist duplicate check failed:", existing.error);
    throw new ProWaitlistError(
      classifySupabaseWaitlistError(existing.error),
      "Could not save waitlist entry",
      existing.error,
    );
  }

  if (existing.data?.id) {
    return {
      success: true,
      duplicate: true,
      id: existing.data.id,
      email,
      note,
      sourcePage,
      userId,
      subscriptionStatus,
      createdAt: existing.data.created_at ?? new Date().toISOString(),
      notificationStatus: "sent",
      message: "You’re already on the Pro waitlist. We’ll notify you when access opens.",
    } satisfies ProWaitlistEntryResult;
  }

  const insertPayload = {
    email,
    note,
    source_page: sourcePage,
    user_id: userId,
    subscription_status: subscriptionStatus,
    email_notification_status: "pending",
    email_notification_error: null,
    email_notified_at: null,
  };

  let insert = await supabaseService
    .from("pro_waitlist")
    .insert(insertPayload)
    .select("id, created_at")
    .single();

  if (insert.error && insert.error.code === "42703") {
    insert = await supabaseService
      .from("pro_waitlist")
      .insert({
        email,
        note,
        source_page: sourcePage,
        email_notification_status: "pending",
        email_notification_error: null,
        email_notified_at: null,
      })
      .select("id, created_at")
      .single();

    if (insert.error && insert.error.code === "42703") {
      insert = await supabaseService
        .from("pro_waitlist")
        .insert({
          email,
          note,
          source_page: sourcePage,
        })
        .select("id, created_at")
        .single();
    }
  }

  if (insert.error) {
    if (insert.error.code === "23505") {
      return {
        success: true,
        duplicate: true,
        id: null,
        email,
        note,
        sourcePage,
        userId,
        subscriptionStatus,
        createdAt: new Date().toISOString(),
        notificationStatus: "sent",
        message: "You’re already on the Pro waitlist. We’ll notify you when access opens.",
      } satisfies ProWaitlistEntryResult;
    }

    console.error("pro waitlist insert failed:", {
      code: insert.error.code,
      message: insert.error.message,
      details: insert.error.details,
      hint: insert.error.hint,
      attemptedColumns: Object.keys(insertPayload),
      sourcePage,
      hasUserId: Boolean(userId),
    });
    throw new ProWaitlistError(
      classifySupabaseWaitlistError(insert.error),
      "Could not save waitlist entry",
      insert.error,
    );
  }

  return {
    success: true,
    duplicate: false,
    id: insert.data?.id ?? null,
    email,
    note,
    sourcePage,
    userId,
    subscriptionStatus,
    createdAt: insert.data?.created_at ?? new Date().toISOString(),
    notificationStatus: "pending",
    message: "You’re on the Pro waitlist. We’ll notify you when access opens.",
  } satisfies ProWaitlistEntryResult;
}

export async function updateProWaitlistNotificationStatus(params: {
  id: string;
  status: "sent" | "failed";
  errorMessage?: string | null;
}) {
  const supabaseService = getWaitlistSupabaseService();
  if (!params.id) return;

  const payload = {
    email_notification_status: params.status,
    email_notification_error: params.errorMessage?.slice(0, 500) || null,
    email_notified_at: params.status === "sent" ? new Date().toISOString() : null,
  };

  let update = await supabaseService
    .from("pro_waitlist")
    .update(payload)
    .eq("id", params.id);

  if (update.error && update.error.code === "42703") {
    update = await supabaseService
      .from("pro_waitlist")
      .update({
        email_notified_at: params.status === "sent" ? new Date().toISOString() : null,
      })
      .eq("id", params.id);

    if (update.error && update.error.code === "42703") {
      return;
    }
  }

  if (update.error) {
    console.error("pro waitlist notification status update failed:", update.error);
  }
}
