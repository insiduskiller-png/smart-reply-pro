"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  created_at?: string;
}

interface Profile {
  username?: string | null;
  subscription_status?: string | null;
  created_at?: string | null;
}

export default function AccountClient() {
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
      setProfile(payload.profile ?? profile);
      setSuccess("Username updated.");
    } catch {
      setError("Unable to update username.");
    } finally {
      setSavingUsername(false);
    }
  }

  async function handlePasswordReset() {
    setSendingReset(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/account/password-reset", {
        method: "POST",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error || "Unable to send reset email.");
        return;
      }
      setSuccess("Password reset email sent.");
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
      setSuccess("Email update requested. Please confirm via email.");
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
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
        <div className="card p-4 text-sm text-slate-300 md:p-6">Loading account...</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
      <div className="card space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">Account</h1>
          <p className="mt-1 text-sm text-slate-300">Manage your profile details.</p>
        </div>

        <div className="space-y-3 text-sm text-slate-300 md:space-y-2">
          <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3 md:border-0 md:bg-transparent md:p-0">
            <span className="text-xs text-slate-400">Username:</span>{" "}
            <span className="font-medium">{profile?.username || user?.email || "-"}</span>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3 md:border-0 md:bg-transparent md:p-0">
            <span className="text-xs text-slate-400">Email:</span>{" "}
            <span className="font-medium">{user?.email || "-"}</span>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3 md:border-0 md:bg-transparent md:p-0">
            <span className="text-xs text-slate-400">Subscription status:</span>{" "}
            <span className="font-medium">{(profile?.subscription_status ?? "free").toLowerCase() === "pro" ? "Pro" : "Free"}</span>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3 md:border-0 md:bg-transparent md:p-0">
            <span className="text-xs text-slate-400">Member since:</span>{" "}
            <span className="font-medium">{formatDate(profile?.created_at ?? user?.created_at ?? null)}</span>
          </div>
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-400">{success}</p> : null}

        <div className="space-y-5 md:space-y-4">
          <div className="space-y-3 md:space-y-2">
            <label className="text-sm font-medium text-slate-300">Username</label>
            <input
              className="h-12 w-full rounded-md border border-slate-700 bg-slate-950 px-4 text-base md:h-10 md:px-3 md:text-sm"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username"
            />
            <button
              type="button"
              className="h-11 w-full rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-60 md:h-auto md:w-auto"
              onClick={handleUsernameChange}
              disabled={savingUsername}
            >
              {savingUsername ? "Updating..." : "Change Username"}
            </button>
          </div>

          <div className="space-y-3 md:space-y-2">
            <label className="text-sm font-medium text-slate-300">Email</label>
            <input
              className="h-12 w-full rounded-md border border-slate-700 bg-slate-950 px-4 text-base md:h-10 md:px-3 md:text-sm"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
            />
            <button
              type="button"
              className="h-11 w-full rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-60 md:h-auto md:w-auto"
              onClick={handleEmailChange}
              disabled={savingEmail}
            >
              {savingEmail ? "Updating..." : "Change Email"}
            </button>
          </div>

          <div className="space-y-3 md:space-y-2">
            <p className="text-sm font-medium text-slate-300">Password</p>
            <button
              type="button"
              className="h-11 w-full rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-60 md:h-auto md:w-auto"
              onClick={handlePasswordReset}
              disabled={sendingReset}
            >
              {sendingReset ? "Sending..." : "Change Password"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
