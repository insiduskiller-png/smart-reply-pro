"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  user_metadata?: {
    username?: string;
  };
}

interface Profile {
  username?: string | null;
  subscription_status?: string | null;
}

export default function NavbarUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  async function fetchUserSession() {
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        try {
          const profileResponse = await fetch("/api/user/profile", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            setProfile(profileData.profile ?? null);
          } else {
            setProfile(null);
          }
        } catch {
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUserSession();
  }, []);

  useEffect(() => {
    function handleUserLoggedIn() {
      fetchUserSession();
    }

    window.addEventListener("userLoggedIn", handleUserLoggedIn);
    return () => window.removeEventListener("userLoggedIn", handleUserLoggedIn);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setProfile(null);
      setMenuOpen(false);
      window.location.href = "/login";
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-300">Loading...</div>;
  }

  if (!user) {
    return <Link href="/login" className="text-sm text-slate-300">Login</Link>;
  }

  const displayName = profile?.username || user.email;
  const planLabel = (profile?.subscription_status ?? "free").toLowerCase() === "pro" ? "Pro" : "Free";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="text-sm text-slate-300"
        onClick={() => setMenuOpen((prev) => !prev)}
      >
        {displayName}
      </button>
      {menuOpen ? (
        <div className="card absolute right-0 mt-2 w-64 p-3 text-sm text-slate-300">
          <div className="space-y-1">
            <div>Username: {displayName}</div>
            <div>Email: {user.email}</div>
            <div>Plan: {planLabel}</div>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/account" className="text-slate-300">Account</Link>
            <button type="button" className="text-left text-slate-300" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
