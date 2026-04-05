"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

export default function DesktopNavCenter() {
  const { user, loading, authStatus } = useAuth();

  if (loading && authStatus === "loading") {
    return <div className="h-5 w-40" />;
  }

  if (user) {
    return <div className="h-5 w-40" />;
  }

  return (
    <div className="flex items-center gap-6 text-sm text-slate-300">
      <Link href="/pricing" className="transition hover:text-sky-300">Pricing</Link>
      <Link href="/dashboard" className="transition hover:text-sky-300">Dashboard</Link>
    </div>
  );
}
