"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { getUsernameTextClass } from "@/lib/username-style";

export default function UserStatusBadge() {
  const { user, profile, loading } = useAuth();

  const displayName = useMemo(() => {
    if (!user) return "";
    const fromProfile = profile?.username?.trim();
    if (fromProfile) return fromProfile;
    const fromMetadata = user.user_metadata?.username?.trim();
    if (fromMetadata) return fromMetadata;
    if (user.email) return user.email.split("@")[0];
    return "Member";
  }, [profile?.username, user]);

  const isPro = (profile?.subscription_status ?? "free").toLowerCase() === "pro";
  const usernameClass = getUsernameTextClass(isPro, profile?.username_color);

  if (loading) {
    return <div className="h-10" />;
  }

  if (!user) {
    return (
      <div className="flex gap-3">
        <Link href="/login" className="rounded-md bg-sky-500 px-4 py-2 font-medium text-slate-950">Sign In</Link>
        <Link href="/register" className="rounded-md border border-slate-700 px-4 py-2">Create Account</Link>
      </div>
    );
  }

  return (
    <div className="text-right">
      <p className="text-sm font-semibold">
        <span className={usernameClass}>{displayName}</span>
      </p>
    </div>
  );
}
