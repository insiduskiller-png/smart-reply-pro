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
      return "mt-6 h-12 w-full rounded-md bg-slate-700 px-4 py-2 text-base font-medium text-slate-400 cursor-not-allowed md:h-auto md:text-sm";
    }
    return "mt-6 h-12 w-full rounded-md bg-sky-500 px-4 py-2 text-base font-medium text-slate-950 disabled:opacity-60 hover:bg-sky-400 md:h-auto md:text-sm";
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-16">
      <h1 className="mb-6 text-center text-2xl font-bold md:mb-8 md:text-3xl">Choose Your Plan</h1>
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <section className="card p-5 md:p-6">
          <h2 className="text-xl font-semibold md:text-xl">Free</h2>
          <p className="mt-2 text-lg font-medium text-slate-300 md:text-base">€0/month</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">✓</span>
              <span>5 generations/day</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">✓</span>
              <span>Single output</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-slate-600">✕</span>
              <span className="text-slate-500">No power score</span>
            </li>
          </ul>
        </section>
        <section className="card border-2 border-sky-500 bg-sky-950/20 p-5 md:p-6">
          <div className="mb-2 inline-block rounded-full bg-sky-500 px-2 py-0.5 text-xs font-semibold text-slate-950">
            RECOMMENDED
          </div>
          <h2 className="text-xl font-semibold md:text-xl">Pro</h2>
          <p className="mt-2 text-lg font-medium text-slate-300 md:text-base">€5.50/month</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">✓</span>
              <span>Unlimited generations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">✓</span>
              <span>Power score engine</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-sky-400">✓</span>
              <span>3 response variants + escalation tools</span>
            </li>
          </ul>
          {isPro && isLoggedIn ? (
            <p className="mt-6 rounded-md border border-emerald-700 bg-emerald-900/40 px-4 py-3 text-center text-sm font-semibold text-emerald-400">
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
            <p className="mt-3 text-center text-xs text-slate-400 md:text-left">
              Don&apos;t have an account?{" "}
              <Link className="text-sky-400 hover:text-sky-300" href="/register">
                Sign up
              </Link>
              {" or "}
              <Link className="text-sky-400 hover:text-sky-300" href="/login">
                Log in
              </Link>
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
