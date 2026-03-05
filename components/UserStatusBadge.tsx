"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: {
    username?: string;
  };
};

type Profile = {
  username?: string | null;
  subscription_status?: string | null;
};

export default function UserStatusBadge() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadUserData() {
      try {
        const meResponse = await fetch("/api/auth/me", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!meResponse.ok) {
          if (!mounted) return;
          setUser(null);
          setProfile(null);
          return;
        }

        const meData = await meResponse.json().catch(() => null);
        const sessionUser = meData?.user as AuthUser | undefined;

        if (!sessionUser) {
          if (!mounted) return;
          setUser(null);
          setProfile(null);
          return;
        }

        if (!mounted) return;
        setUser(sessionUser);

        const profileResponse = await fetch("/api/user/profile", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!mounted) return;

        if (profileResponse.ok) {
          const profileData = await profileResponse.json().catch(() => null);
          setProfile(profileData?.profile ?? null);
        } else {
          setProfile(null);
        }
      } catch {
        if (!mounted) return;
        setUser(null);
        setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadUserData();

    return () => {
      mounted = false;
    };
  }, []);

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
      <p className="text-sm text-slate-200">Welcome, {displayName}</p>
      <span
        className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
          isPro
            ? "border border-amber-500/40 bg-amber-500/10 text-amber-300"
            : "border border-slate-600 bg-slate-800/60 text-slate-300"
        }`}
      >
        {isPro ? "Pro Member" : "Free Member"}
      </span>
    </div>
  );
}
