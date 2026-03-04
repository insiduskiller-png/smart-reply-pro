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
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="card p-6 text-sm text-slate-300">Loading account...</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="card space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Account</h1>
          <p className="text-sm text-slate-300">Manage your profile details.</p>
        </div>

        <div className="space-y-2 text-sm text-slate-300">
          <div>Username: {profile?.username || user?.email || "-"}</div>
          <div>Email: {user?.email || "-"}</div>
          <div>Subscription status: {(profile?.subscription_status ?? "free").toLowerCase() === "pro" ? "Pro" : "Free"}</div>
          <div>Member since: {formatDate(profile?.created_at ?? user?.created_at ?? null)}</div>
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-400">{success}</p> : null}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Username</label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username"
            />
            <button
              type="button"
              className="rounded-md border border-slate-700 px-4 py-2 text-sm"
              onClick={handleUsernameChange}
              disabled={savingUsername}
            >
              {savingUsername ? "Updating..." : "Change Username"}
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Email</label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
            />
            <button
              type="button"
              className="rounded-md border border-slate-700 px-4 py-2 text-sm"
              onClick={handleEmailChange}
              disabled={savingEmail}
            >
              {savingEmail ? "Updating..." : "Change Email"}
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-slate-300">Password</p>
            <button
              type="button"
              className="rounded-md border border-slate-700 px-4 py-2 text-sm"
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
