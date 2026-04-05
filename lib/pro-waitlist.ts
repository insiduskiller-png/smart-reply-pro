import { supabaseService } from "@/lib/supabase";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CreateProWaitlistEntryInput = {
  email: string;
  note?: string | null;
  sourcePage?: string | null;
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

export async function createProWaitlistEntry(input: CreateProWaitlistEntryInput) {
  const email = normalizeWaitlistEmail(input.email);
  const note = sanitizeNote(input.note);
  const sourcePage = sanitizeSourcePage(input.sourcePage);

  const existing = await supabaseService
    .from("pro_waitlist")
    .select("id")
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
      message: "You’re already on the Pro waitlist.",
    } as const;
  }

  const insert = await supabaseService
    .from("pro_waitlist")
    .insert({
      email,
      note,
      source_page: sourcePage,
    })
    .select("id")
    .single();

  if (insert.error) {
    if (insert.error.code === "23505") {
      return {
        success: true,
        duplicate: true,
        message: "You’re already on the Pro waitlist.",
      } as const;
    }

    console.error("pro waitlist insert failed:", insert.error);
    throw new Error("Could not save waitlist entry");
  }

  return {
    success: true,
    duplicate: false,
    message: "You’re on the Pro waitlist.",
  } as const;
}
