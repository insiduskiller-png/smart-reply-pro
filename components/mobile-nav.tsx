"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import AnimatedUsername from "@/components/animated-username";
import { hasProAccess, PRO_ENABLED } from "@/lib/billing";

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, profile, loading, authStatus, logout } = useAuth();
  const displayName = profile?.username?.trim() || user?.email?.split("@")[0] || "Account";
  const usernameColor = profile?.username_color || "#ffffff";
  const isPro = hasProAccess(profile?.subscription_status);
  const planLabel = isPro ? "Pro" : "Free";

  async function handleLogout() {
    await logout("/");
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <img src="/srp-icon.png" alt="Smart Reply Pro" className="h-12 w-auto" />
            <span className="text-lg font-semibold tracking-tight text-slate-100">Smart Reply Pro</span>
          </Link>
          
          <div className="flex items-center gap-3">
            {authStatus === "authenticated" && user ? (
              <AnimatedUsername
                text={displayName}
                isPro={isPro}
                colorPreset={usernameColor}
                className="text-sm font-semibold"
              />
            ) : null}
            
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
              {authStatus === "authenticated" && user && (
                <div className="border-b border-slate-800 px-4 py-4">
                  <AnimatedUsername
                    text={displayName}
                    isPro={isPro}
                    colorPreset={usernameColor}
                    className="text-base font-semibold"
                  />
                  <p className="mt-1 text-sm text-slate-400">{user.email}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Plan status</span>
                    <span className="rounded-full border border-slate-700 px-2 py-0.5 text-slate-200">{planLabel}</span>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <nav className="flex-1 overflow-y-auto px-2 py-4">
                <div className="space-y-1">
                  {loading && authStatus === "loading" ? (
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
                        Account
                      </Link>
                      <Link
                        href="/pricing"
                        className="flex h-11 items-center rounded-md px-3 text-sm text-slate-200 hover:bg-slate-800"
                        onClick={() => setIsOpen(false)}
                      >
                        {isPro ? "Manage Plan" : "View Pricing"}
                      </Link>
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          void handleLogout();
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
