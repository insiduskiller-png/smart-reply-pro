"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  normalizeUsernamePreset,
  USERNAME_TRANSITION_DURATION_MS,
  USERNAME_COLOR_OPTIONS,
  type UsernameColorPreset,
} from "@/lib/username-style";
import { useAuth } from "@/components/auth-provider";
import AnimatedUsername from "@/components/animated-username";
import { hasProAccess, PRO_ENABLED, PRO_WAITLIST_HREF } from "@/lib/billing";

interface User {
  id: string;
  email: string;
  created_at?: string;
}

interface Profile {
  username?: string | null;
  subscription_status?: string | null;
  created_at?: string | null;
  username_color?: string | null;
  username_style?: string | null;
}

export default function AccountClient() {
  const { refreshProfile, setProfileState } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingUsernameColor, setSavingUsernameColor] = useState(false);
  const [isUsernameTransitioning, setIsUsernameTransitioning] = useState(false);
  const [awaitingSavedTransition, setAwaitingSavedTransition] = useState(false);
  const [transitionPreviousTheme, setTransitionPreviousTheme] = useState<UsernameColorPreset | null>(null);
  const [transitionNextTheme, setTransitionNextTheme] = useState<UsernameColorPreset | null>(null);
  const [usernameColor, setUsernameColor] = useState<UsernameColorPreset>("default");
  const [editingSection, setEditingSection] = useState<"username" | "email" | null>(null);

  const subscriptionStatus = typeof profile?.subscription_status === "string"
    ? profile.subscription_status
    : "free";
  const isPro = hasProAccess(subscriptionStatus);

  const displayName =
    profile?.username?.trim() || user?.email?.split("@")[0] || "Member";
  const resolvedColor = normalizeUsernamePreset(profile?.username_color);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [userRes, profileRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/user/profile"),
        ]);

        let userData: { user?: User | null } | null = null;
        if (userRes.ok) {
          userData = await userRes.json().catch(() => null);
          setUser(userData?.user ?? null);
        } else {
          setUser(null);
        }

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData.profile ?? null);
          setUsername(profileData.profile?.username ?? "");
          setUsernameColor(normalizeUsernamePreset(profileData.profile?.username_color));
        } else {
          setProfile(null);
        }

        if (userData?.user?.email) {
          setEmail(userData.user.email);
        }
      } catch {
        setError("Unable to load account details.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  async function handleUsernameChange() {
    if (!username.trim()) {
      setError("Username cannot be empty.");
      return;
    }

    setSavingUsername(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error || "Unable to update username.");
        return;
      }
      const nextProfile = payload?.profile ?? profile;
      setProfile(nextProfile);
      setProfileState(nextProfile ?? null);
      await refreshProfile();
      setSuccess("Username updated.");
    } catch {
      setError("Unable to update username.");
    } finally {
      setSavingUsername(false);
    }
  }

  async function handleUsernameColorSave() {
    if (savingUsernameColor || isUsernameTransitioning) {
      return;
    }

    setSavingUsernameColor(true);
    setError("");
    setSuccess("");

    try {
      const previousProfileColor = normalizeUsernamePreset(profile?.username_color);

      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username_color: usernameColor, username_style: "gradient" }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error || "Unable to save customization.");
        return;
      }

      const nextProfile = payload?.profile ?? profile;
      setProfile(nextProfile);
      setProfileState(nextProfile ?? null);

      const nextProfileColor = normalizeUsernamePreset(nextProfile?.username_color);
      if (nextProfileColor !== previousProfileColor) {
        setTransitionPreviousTheme(previousProfileColor);
        setTransitionNextTheme(nextProfileColor);
        setAwaitingSavedTransition(true);
        setIsUsernameTransitioning(true);
      } else {
        setTransitionPreviousTheme(null);
        setTransitionNextTheme(null);
        setAwaitingSavedTransition(false);
        setIsUsernameTransitioning(false);
      }

      await refreshProfile();
      setSuccess("Profile customization updated.");
    } catch {
      setTransitionPreviousTheme(null);
      setTransitionNextTheme(null);
      setAwaitingSavedTransition(false);
      setIsUsernameTransitioning(false);
      setError("Unable to save customization.");
    } finally {
      setSavingUsernameColor(false);
    }
  }

  function handleSavedUsernameTransitionStateChange(transitioning: boolean) {
    if (!awaitingSavedTransition) {
      return;
    }

    if (!transitioning) {
      setTransitionPreviousTheme(null);
      setTransitionNextTheme(null);
      setAwaitingSavedTransition(false);
      setIsUsernameTransitioning(false);
    }
  }

  function handleSavedUsernameTransitionComplete() {
    if (!awaitingSavedTransition) {
      return;
    }

    setTransitionPreviousTheme(null);
    setTransitionNextTheme(null);
    setAwaitingSavedTransition(false);
    setIsUsernameTransitioning(false);
  }

  async function handlePasswordReset() {
    setSendingReset(true);
    setError("");
    setSuccess("");

    try {
      console.info("reset-request-start", {
        source: "account-settings-send-reset-link",
        targetRoute: "/api/account/password-reset",
      });

      const response = await fetch("/api/account/password-reset", {
        method: "POST",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error || "Unable to send reset email.");
        return;
      }
      setSuccess(payload?.message || "Password reset email sent.");
    } catch {
      setError("Unable to send reset email.");
    } finally {
      setSendingReset(false);
    }
  }

  async function handleEmailChange() {
    if (!email.trim()) {
      setError("Email cannot be empty.");
      return;
    }

    setSavingEmail(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/account/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error || "Unable to update email.");
        return;
      }
      setSuccess(payload?.message || "Email update requested. Please confirm via email.");
    } catch {
      setError("Unable to update email.");
    } finally {
      setSavingEmail(false);
    }
  }

  function formatDate(value?: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString();
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
        <div className="card p-4 text-sm text-slate-300 md:p-6">Setting up your account...</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">Account Settings</h1>
          <p className="mt-1 text-sm text-slate-300">Manage your identity and preferences</p>
        </div>

        {error ? <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}
        {success ? <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{success}</p> : null}

        <section id="account-overview" className="card space-y-4 p-5 md:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Profile Identity</h2>
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 shadow-[0_0_24px_rgba(56,189,248,0.12)]">
            <AnimatedUsername
              text={displayName}
              isPro={isPro}
              colorPreset={resolvedColor}
              className="text-3xl font-bold tracking-tight md:text-4xl"
            />
            <p className="mt-2 text-sm text-slate-300">{user?.email || "-"}</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Member since</p>
                <p className="mt-1 font-medium text-slate-100">{formatDate(profile?.created_at ?? user?.created_at ?? null)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Plan status</p>
                <p className="mt-1 font-medium text-slate-100">{isPro ? "Pro" : "Free"}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-5 md:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Account Actions</h2>

          <div className="space-y-3">
            <div id="change-username" className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 scroll-mt-24">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="font-medium text-slate-100">Change Username</p>
                  <p className="text-sm text-slate-400">Update how your identity appears.</p>
                </div>
                <button
                  type="button"
                  className="h-10 rounded-md border border-slate-600 px-4 text-sm font-medium text-slate-200 transition hover:scale-[1.01] hover:bg-slate-800"
                  onClick={() => setEditingSection((value) => (value === "username" ? null : "username"))}
                >
                  {editingSection === "username" ? "Close" : "Edit"}
                </button>
              </div>

              {editingSection === "username" ? (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    className="h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Username"
                  />
                  <button
                    type="button"
                    className="h-11 rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] hover:bg-slate-200 disabled:opacity-60"
                    onClick={handleUsernameChange}
                    disabled={savingUsername}
                  >
                    {savingUsername ? "Saving..." : "Save Username"}
                  </button>
                </div>
              ) : null}
            </div>

            <div id="change-email" className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 scroll-mt-24">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="font-medium text-slate-100">Change Email</p>
                  <p className="text-sm text-slate-400">Update your login and notification email.</p>
                </div>
                <button
                  type="button"
                  className="h-10 rounded-md border border-slate-600 px-4 text-sm font-medium text-slate-200 transition hover:scale-[1.01] hover:bg-slate-800"
                  onClick={() => setEditingSection((value) => (value === "email" ? null : "email"))}
                >
                  {editingSection === "email" ? "Close" : "Edit"}
                </button>
              </div>

              {editingSection === "email" ? (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      className="h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Email"
                    />
                    <button
                      type="button"
                      className="h-11 rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] hover:bg-slate-200 disabled:opacity-60"
                      onClick={handleEmailChange}
                      disabled={savingEmail}
                    >
                      {savingEmail ? "Sending..." : "Verify New Email"}
                    </button>
                  </div>
                  <p className="text-sm text-slate-400">
                    For security, your current email stays active until the new email is verified.
                  </p>
                  <p className="text-sm text-slate-400">
                    Need help? Contact <a href="mailto:support@smartreplypro.ai" className="text-sky-400 hover:text-sky-300">support@smartreplypro.ai</a>
                  </p>
                </div>
              ) : null}
            </div>

            <div id="change-password" className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 scroll-mt-24">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="font-medium text-slate-100">Change Password</p>
                  <p className="text-sm text-slate-400">Receive a secure reset link by email.</p>
                </div>
                <button
                  type="button"
                  className="h-10 rounded-md border border-slate-600 px-4 text-sm font-medium text-slate-200 transition hover:scale-[1.01] hover:bg-slate-800 disabled:opacity-60"
                  onClick={handlePasswordReset}
                  disabled={sendingReset}
                >
                  {sendingReset ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-400">
                We’ll email a secure password reset link to your current address.
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Need help? Contact <a href="mailto:support@smartreplypro.ai" className="text-sky-400 hover:text-sky-300">support@smartreplypro.ai</a>
              </p>
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-5 md:p-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Profile Customization</h2>
            <p className="mt-1 text-sm text-slate-300">Customize how your identity appears across the platform</p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="username-color">
              Username color
            </label>
            <select
              id="username-color"
              className="h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
              value={usernameColor}
              onChange={(event) => setUsernameColor(event.target.value as UsernameColorPreset)}
              disabled={savingUsernameColor || isUsernameTransitioning}
            >
              {USERNAME_COLOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-5">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Live preview</p>
              <AnimatedUsername
                text={displayName}
                isPro
                colorPreset={resolvedColor}
                className="text-3xl font-bold"
                durationMs={USERNAME_TRANSITION_DURATION_MS}
                previousTheme={transitionPreviousTheme}
                nextTheme={transitionNextTheme || resolvedColor}
                isTransitioning={awaitingSavedTransition && isUsernameTransitioning}
                onTransitionStateChange={handleSavedUsernameTransitionStateChange}
                onTransitionComplete={handleSavedUsernameTransitionComplete}
              />
            </div>

            <button
              type="button"
              className="mt-4 inline-flex h-11 min-w-[12.5rem] items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] hover:bg-slate-200 disabled:opacity-60"
              onClick={handleUsernameColorSave}
              disabled={savingUsernameColor || isUsernameTransitioning}
            >
              {savingUsernameColor || isUsernameTransitioning ? "Applying..." : "Save Customization"}
            </button>
          </div>
        </section>

        <section id="plan-status" className="card space-y-3 p-5 md:p-6 scroll-mt-24">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Subscription</h2>
          <p className="text-base text-slate-100">Current Plan: {isPro ? "Pro" : "Free"}</p>
          {!PRO_ENABLED && !isPro ? (
            <>
              <p className="text-sm text-slate-300">Pro is coming soon. Sign up for the waitlist to be notified at launch.</p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={PRO_WAITLIST_HREF}
                  className="inline-flex h-10 items-center rounded-md bg-sky-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                >
                  Join Waitlist
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex h-10 items-center rounded-md border border-slate-600 px-4 text-sm font-medium text-slate-200 transition hover:scale-[1.01] hover:bg-slate-800"
                >
                  See Launch Details
                </Link>
              </div>
            </>
          ) : !isPro ? (
            <Link
              href="/pricing"
              className="inline-flex h-10 items-center rounded-md border border-slate-600 px-4 text-sm font-medium text-slate-200 transition hover:scale-[1.01] hover:bg-slate-800"
            >
              View Pro plan
            </Link>
          ) : null}
        </section>
      </div>
    </main>
  );
}
