"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { getUsernameTextClass, resolveUsernameColor, resolveUsernameStyle } from "@/lib/username-style";

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, profile, loading } = useAuth();
  const displayName = profile?.username?.trim() || "User";
  const usernameColor = profile?.username_color || "#ffffff";
  const usernameStyle = profile?.username_style || "solid";
  const isPro = (profile?.subscription_status ?? "free").toLowerCase() === "pro";
  const resolvedColor = resolveUsernameColor(usernameColor);
  const resolvedStyle = resolveUsernameStyle(usernameStyle);
  const usernameClass = resolvedStyle === "gradient" ? getUsernameTextClass(isPro, resolvedColor) : "";

  async function handleLogout() {
    try {
      await supabaseBrowser.auth.signOut();
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="text-base font-semibold tracking-tight">
            Smart Reply Pro
          </Link>
          
          <div className="flex items-center gap-3">
            {!loading && user ? <span className={`text-sm font-semibold ${usernameClass}`} style={resolvedStyle === "solid" ? { color: resolvedColor } : undefined}>{displayName}</span> : null}
            
            {/* Hamburger Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              aria-label="Menu"
            >
              {isOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Slide-in Menu Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed right-0 top-0 z-50 h-full w-72 border-l border-slate-800 bg-slate-950 shadow-2xl md:hidden">
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <span className="text-sm font-semibold">Menu</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  aria-label="Close menu"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* User welcome block */}
              {!loading && user && (
                <div className="border-b border-slate-800 px-4 py-4">
                  <p className={`text-base font-semibold ${usernameClass}`} style={resolvedStyle === "solid" ? { color: resolvedColor } : undefined}>{displayName}</p>
                </div>
              )}

              {/* Navigation Links */}
              <nav className="flex-1 overflow-y-auto px-2 py-4">
                <div className="space-y-1">
                  {loading ? (
                    /* Skeleton while auth state loads */
                    <>
                      <div className="h-11 rounded-md bg-slate-800/50 animate-pulse" />
                      <div className="h-11 rounded-md bg-slate-800/50 animate-pulse" />
                      <div className="h-11 rounded-md bg-slate-800/50 animate-pulse" />
                    </>
                  ) : user ? (
                    <>
                      <Link
                        href="/dashboard"
                        className="flex h-11 items-center rounded-md px-3 text-sm text-slate-200 hover:bg-slate-800"
                        onClick={() => setIsOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/account"
                        className="flex h-11 items-center rounded-md px-3 text-sm text-slate-200 hover:bg-slate-800"
                        onClick={() => setIsOpen(false)}
                      >
                        Account Settings
                      </Link>
                      <Link
                        href="/pricing"
                        className="flex h-11 items-center rounded-md px-3 text-sm text-slate-200 hover:bg-slate-800"
                        onClick={() => setIsOpen(false)}
                      >
                        Pricing
                      </Link>
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          handleLogout();
                        }}
                        className="flex h-11 w-full items-center rounded-md px-3 text-left text-sm text-rose-400 hover:bg-slate-800"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/pricing"
                        className="flex h-11 items-center rounded-md px-3 text-sm text-slate-200 hover:bg-slate-800"
                        onClick={() => setIsOpen(false)}
                      >
                        Pricing
                      </Link>
                      <Link
                        href="/login"
                        className="flex h-11 items-center rounded-md px-3 text-sm text-slate-200 hover:bg-slate-800"
                        onClick={() => setIsOpen(false)}
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/register"
                        className="flex h-11 items-center rounded-md bg-sky-500 px-3 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                        onClick={() => setIsOpen(false)}
                      >
                        Create Account
                      </Link>
                    </>
                  )}
                </div>
              </nav>
            </div>
          </div>
        </>
      )}
    </>
  );
}
