"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import AnimatedUsername from "@/components/animated-username";
import { logoutUser } from "@/lib/client-auth";

export default function NavbarUser() {
  const { user, profile, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const displayName = profile?.username?.trim() || "User";
  const usernameColor = profile?.username_color || "#ffffff";

  async function handleLogout() {
    await logoutUser("/");
  }

  const isPro = (profile?.subscription_status ?? "free").toLowerCase() === "pro";

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  if (loading) {
    return <div className="h-9 w-28" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/login" className="hover:text-sky-400">
          Sign In
        </Link>
        <Link href="/register" className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-400">
          Create Account
        </Link>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="text-right">
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className="rounded-md px-2 py-1 text-sm font-semibold transition hover:bg-slate-800/70 hover:scale-[1.01]"
        >
          <AnimatedUsername
            text={displayName}
            isPro={isPro}
            colorPreset={usernameColor}
            className="text-sm font-semibold"
          />
        </button>
        {!isPro ? (
          <div className="pr-2">
            <Link
              href="/pricing"
              className="text-xs text-slate-400 transition hover:text-slate-200"
              onClick={() => setIsOpen(false)}
            >
              Pricing
            </Link>
          </div>
        ) : null}
      </div>

      {isOpen ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-slate-700 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur">
          <Link
            href="/dashboard"
            className="block rounded-md px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
            onClick={() => setIsOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href="/account"
            className="block rounded-md px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
            onClick={() => setIsOpen(false)}
          >
            Account Settings
          </Link>
          <div className="my-1 h-px bg-slate-700" />
          <button
            type="button"
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-rose-300 transition hover:bg-slate-800"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}
