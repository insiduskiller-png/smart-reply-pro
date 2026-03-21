"use client";

import { supabaseBrowser } from "@/lib/supabase-browser";
import { clearSessionPersistenceState } from "@/lib/session-persistence";

export async function clearBrowserSession() {
  clearSessionPersistenceState();

  await Promise.allSettled([
    supabaseBrowser.auth.signOut(),
    fetch("/api/auth/logout", { method: "POST" }),
    fetch("/api/auth/session", { method: "DELETE" }),
  ]);
}

export async function logoutUser(redirectPath = "/") {
  try {
    await clearBrowserSession();
  } finally {
    if (typeof window !== "undefined") {
      window.location.assign(redirectPath);
    }
  }
}