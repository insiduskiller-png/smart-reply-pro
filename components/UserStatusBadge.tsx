"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { resolveUsernameColor } from "@/lib/username-style";

export default function UserStatusBadge() {
  const { user, profile, loading } = useAuth();
  const displayName = profile?.username?.trim() || "User";
  const usernameColor = resolveUsernameColor(profile?.username_color);

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
        <span style={{ color: usernameColor }}>{displayName}</span>
      </p>
    </div>
  );
}
