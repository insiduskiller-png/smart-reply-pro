"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import AnimatedUsername from "@/components/animated-username";
import { hasProAccess, PRO_ENABLED } from "@/lib/billing";

export default function NavbarUser() {
  const { user, profile, loading, authStatus, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 256 });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const displayName = profile?.username?.trim() || user?.email?.split("@")[0] || "Account";
  const usernameColor = profile?.username_color || "#ffffff";
  const planLabel = hasProAccess(profile?.subscription_status) ? "Pro" : PRO_ENABLED ? "Free" : "Free Public Launch";

  async function handleLogout() {
    setIsOpen(false);
    await logout("/");
  }

  const isPro = hasProAccess(profile?.subscription_status);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    function updateMenuPosition() {
      if (!triggerRef.current) return;

      const rect = triggerRef.current.getBoundingClientRect();
      const width = 256;
      const viewportPadding = 8;
      const maxLeft = Math.max(viewportPadding, window.innerWidth - width - viewportPadding);
      const left = Math.min(Math.max(viewportPadding, rect.right - width), maxLeft);
      const top = rect.bottom + 8;

      setMenuPosition({ top, left, width });
    }

    if (!isOpen) return;

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInsideRoot = !!rootRef.current?.contains(target);
      const clickedInsideMenu = !!menuRef.current?.contains(target);
      if (!clickedInsideRoot && !clickedInsideMenu) {
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

  if (loading && authStatus === "loading") {
    return (
      <div className="flex min-w-[12.5rem] justify-end">
        <div className="h-10 w-44 animate-pulse rounded-md border border-slate-800 bg-slate-900/70" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-w-[12.5rem] items-center justify-end gap-3">
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
    <div className="relative min-w-[12.5rem]" ref={rootRef}>
      <div className="flex justify-end">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls="account-menu"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700 bg-slate-900/80 px-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900"
        >
          <AnimatedUsername
            text={displayName}
            isPro={isPro}
            colorPreset={usernameColor}
            className="text-sm font-semibold"
          />

          <span
            className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              isPro
                ? "border-emerald-700/70 bg-emerald-900/30 text-emerald-300"
                : "border-slate-600 bg-slate-800/90 text-slate-300"
            }`}
          >
            {isPro ? "Pro" : "Free"}
          </span>

          <svg
            className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {isOpen && isMounted
        ? createPortal(
          <div
            id="account-menu"
            ref={menuRef}
            role="menu"
            className="fixed z-[120] rounded-xl border border-slate-700 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              width: `${menuPosition.width}px`,
            }}
          >
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-3">
              <p className="text-sm font-semibold text-slate-100">
                <AnimatedUsername
                  text={displayName}
                  isPro={isPro}
                  colorPreset={usernameColor}
                  className="text-sm font-semibold"
                />
              </p>
              <p className="mt-1 text-xs text-slate-400">{user.email}</p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-500">Plan status</span>
                <span className="rounded-full border border-slate-700 px-2 py-0.5 text-slate-200">{planLabel}</span>
              </div>
            </div>
            <Link
              href="/dashboard"
              role="menuitem"
              className="mt-1 block rounded-md px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/account"
              role="menuitem"
              className="block rounded-md px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
              onClick={() => setIsOpen(false)}
            >
              Account
            </Link>
            <Link
              href="/pricing"
              role="menuitem"
              className="block rounded-md px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
              onClick={() => setIsOpen(false)}
            >
              {isPro ? "Manage Plan" : "View Pricing"}
            </Link>
            <div className="my-1 h-px bg-slate-700" />
            <button
              type="button"
              role="menuitem"
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-rose-300 transition hover:bg-slate-800"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>,
          document.body,
        )
        : null}
    </div>
  );
}
