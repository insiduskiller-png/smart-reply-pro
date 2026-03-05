"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function NavbarUser() {
  const { user, profile, loading } = useAuth();

  async function handleLogout() {
    try {
      await supabaseBrowser.auth.signOut();
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  }

  if (loading) {
    return <div className="h-9 w-28" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950">
          Sign In
        </Link>
        <Link href="/register" className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200">
          Create Account
        </Link>
      </div>
    );
  }

  const displayName = useMemo(() => {
    const profileName = profile?.username?.trim();
    if (profileName) return profileName;
    const metadataName = user.user_metadata?.username?.trim();
    if (metadataName) return metadataName;
    return (user.email ?? "Member").split("@")[0];
  }, [profile?.username, user.email, user.user_metadata?.username]);

  const isPro = (profile?.subscription_status ?? "free").toLowerCase() === "pro";

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm text-slate-100">Welcome, {displayName}</p>
        <span
          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
            isPro
              ? "border border-amber-500/40 bg-amber-500/10 text-amber-300"
              : "border border-slate-600 bg-slate-800/60 text-slate-300"
          }`}
        >
          {isPro ? "Pro Member" : "Free Member"}
        </span>
      </div>
      <Link href="/account" className="text-xs text-slate-300 hover:text-sky-300">Account</Link>
      <button type="button" className="text-xs text-slate-300 hover:text-sky-300" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}
