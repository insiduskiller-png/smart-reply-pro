"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { getUsernameTextClass, resolveUsernameColor, resolveUsernameStyle } from "@/lib/username-style";

export default function UserStatusBadge() {
  const { user, profile, loading } = useAuth();
  const displayName = profile?.username?.trim() || "User";
  const usernameColor = profile?.username_color || "#ffffff";
  const usernameStyle = profile?.username_style || "solid";
  const isPro = (profile?.subscription_status ?? "free").toLowerCase() === "pro";
  const resolvedColor = resolveUsernameColor(usernameColor);
  const resolvedStyle = resolveUsernameStyle(usernameStyle);
  const usernameClass = resolvedStyle === "gradient" ? getUsernameTextClass(isPro, resolvedColor) : "";

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
        <span className={usernameClass} style={resolvedStyle === "solid" ? { color: resolvedColor } : undefined}>{displayName}</span>
      </p>
    </div>
  );
}
