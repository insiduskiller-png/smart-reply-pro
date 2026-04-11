import { supabaseService } from "@/lib/supabase";

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
  message: string;
};

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
    throw new Error("Could not save waitlist entry");
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
      message: "You’re already on the Pro waitlist. We’ll notify you when access opens.",
    } satisfies ProWaitlistEntryResult;
  }

  const insertPayload = {
    email,
    note,
    source_page: sourcePage,
    user_id: userId,
    subscription_status: subscriptionStatus,
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
      })
      .select("id, created_at")
      .single();
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
        message: "You’re already on the Pro waitlist. We’ll notify you when access opens.",
      } satisfies ProWaitlistEntryResult;
    }

    console.error("pro waitlist insert failed:", insert.error);
    throw new Error("Could not save waitlist entry");
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
    message: "You’re on the Pro waitlist. We’ll notify you when access opens.",
  } satisfies ProWaitlistEntryResult;
}

export async function deleteProWaitlistEntryById(id: string) {
  if (!id) return;

  const remove = await supabaseService
    .from("pro_waitlist")
    .delete()
    .eq("id", id);

  if (remove.error) {
    console.error("pro waitlist rollback delete failed:", remove.error);
  }
}
