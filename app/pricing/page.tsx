"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

type Profile = {
  subscription_status?: string | null;
};

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuthAndProfile() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          setIsLoggedIn(true);
          
          // Fetch profile
          try {
            const profileResponse = await fetch("/api/user/profile", {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            });

            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              setProfile(profileData.profile ?? null);
            }
          } catch {
            setProfile(null);
          }
        } else {
          setIsLoggedIn(false);
          setProfile(null);
        }
      } catch {
        setIsLoggedIn(false);
        setProfile(null);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuthAndProfile();
  }, []);

  const isPro = (profile?.subscription_status ?? "free").toLowerCase() === "pro";

  async function startCheckout() {
    if (!isLoggedIn) {
      window.location.href = "/login?next=/pricing";
      return;
    }

    if (isPro) {
      return; // Do nothing if already Pro
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", { method: "POST" });
      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login?next=/pricing";
        return;
      }

      if (!response.ok || !data?.url) {
        setError(data?.error || "Checkout failed. Please try again in a moment.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Network error while creating checkout session.");
    } finally {
      setLoading(false);
    }
  }

  function getButtonText() {
    if (checkingAuth) return "Loading...";
    if (!isLoggedIn) return "Create Account to Upgrade";
    if (isPro) return "Pro Active";
    if (loading) return "Redirecting...";
    return "Upgrade to Pro";
  }

  function getButtonClass() {
    if (isPro || !isLoggedIn) {
      return "mt-6 rounded-md bg-slate-700 px-4 py-2 font-medium text-slate-400 cursor-not-allowed";
    }
    return "mt-6 rounded-md bg-sky-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60 hover:bg-sky-400";
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-xl font-semibold">Free</h2>
          <p className="mt-2 text-slate-300">€0/month</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>5 generations/day</li>
            <li>Single output</li>
            <li>No power score</li>
          </ul>
        </section>
        <section className="card border-sky-500 p-6">
          <h2 className="text-xl font-semibold">Pro</h2>
          <p className="mt-2 text-slate-300">€5.50/month</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>Unlimited generations</li>
            <li>Power score engine</li>
            <li>3 response variants + escalation tools</li>
          </ul>
          {isPro && isLoggedIn ? (
            <p className="mt-6 rounded-md border border-emerald-700 bg-emerald-900/40 px-4 py-2 text-center text-sm font-semibold text-emerald-400">
              You are already a Pro member
            </p>
          ) : null}
          <button
            className={getButtonClass()}
            onClick={startCheckout}
            disabled={loading || checkingAuth || isPro || !isLoggedIn}
          >
            {getButtonText()}
          </button>
          {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
          {!isLoggedIn && !checkingAuth ? (
            <p className="mt-3 text-xs text-slate-400">
              Don&apos;t have an account?{" "}
              <Link className="text-sky-400" href="/register">
                Sign up
              </Link>
              {" or "}
              <Link className="text-sky-400" href="/login">
                Log in
              </Link>
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
