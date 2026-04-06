"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  function resetFormErrors() {
    setError("");
    setUsernameError("");
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");
  }

  function validateForm() {
    let isValid = true;
    resetFormErrors();

    const trimmedUsername = username.trim();
    const normalizedEmail = email.trim();

    if (!trimmedUsername) {
      setUsernameError("Enter a username.");
      isValid = false;
    } else if (trimmedUsername.length < 3) {
      setUsernameError("Username must be at least 3 characters.");
      isValid = false;
    }

    if (!normalizedEmail) {
      setEmailError("Enter your email address.");
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setEmailError("Enter a valid email address.");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Create a password.");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError("Confirm your password.");
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      isValid = false;
    }

    return isValid;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (loading) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    resetFormErrors();
    setSuccess("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed.");
        setLoading(false);
        return;
      }

      setSuccess("Account created. Please confirm your email from the link we sent.");
      setLoading(false);

      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (e) {
      console.error("Register error:", e);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_52%),linear-gradient(180deg,rgba(15,23,42,0.32),rgba(2,6,23,0))]" />

      <div className="w-full max-w-md">
        <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/88 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur md:p-8">
          <div className="mb-6 text-center">
            <div className="inline-flex rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
              Create account
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white">Start your workspace</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400 md:text-base">
              Set up your Smart Reply Pro account to generate polished replies and save your strategy across devices.
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
              {success}
            </div>
          ) : null}

          <form onSubmit={handleRegister} className="space-y-4" noValidate>
            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-medium text-slate-200">
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (usernameError || error) {
                    setUsernameError("");
                    setError("");
                  }
                }}
                disabled={loading}
                aria-invalid={Boolean(usernameError)}
                aria-describedby={usernameError ? "register-username-error" : undefined}
                className={`h-12 w-full rounded-xl border bg-slate-950 px-4 text-base text-white placeholder:text-slate-500 transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                  usernameError
                    ? "border-rose-500/60 focus:border-rose-400"
                    : "border-slate-700 focus:border-sky-400"
                }`}
                autoComplete="username"
                required
                minLength={3}
              />
              {usernameError ? (
                <p id="register-username-error" className="mt-2 text-sm text-rose-300">
                  {usernameError}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError || error) {
                    setEmailError("");
                    setError("");
                  }
                }}
                disabled={loading}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? "register-email-error" : undefined}
                className={`h-12 w-full rounded-xl border bg-slate-950 px-4 text-base text-white placeholder:text-slate-500 transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                  emailError
                    ? "border-rose-500/60 focus:border-rose-400"
                    : "border-slate-700 focus:border-sky-400"
                }`}
                autoComplete="email"
                required
              />
              {emailError ? (
                <p id="register-email-error" className="mt-2 text-sm text-rose-300">
                  {emailError}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError || confirmPasswordError || error) {
                    setPasswordError("");
                    setConfirmPasswordError("");
                    setError("");
                  }
                }}
                disabled={loading}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? "register-password-error" : undefined}
                className={`h-12 w-full rounded-xl border bg-slate-950 px-4 text-base text-white placeholder:text-slate-500 transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                  passwordError
                    ? "border-rose-500/60 focus:border-rose-400"
                    : "border-slate-700 focus:border-sky-400"
                }`}
                autoComplete="new-password"
                required
                minLength={6}
              />
              {passwordError ? (
                <p id="register-password-error" className="mt-2 text-sm text-rose-300">
                  {passwordError}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-200">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmPasswordError || error) {
                    setConfirmPasswordError("");
                    setError("");
                  }
                }}
                disabled={loading}
                aria-invalid={Boolean(confirmPasswordError)}
                aria-describedby={confirmPasswordError ? "register-confirm-password-error" : undefined}
                className={`h-12 w-full rounded-xl border bg-slate-950 px-4 text-base text-white placeholder:text-slate-500 transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                  confirmPasswordError
                    ? "border-rose-500/60 focus:border-rose-400"
                    : "border-slate-700 focus:border-sky-400"
                }`}
                autoComplete="new-password"
                required
                minLength={6}
              />
              {confirmPasswordError ? (
                <p id="register-confirm-password-error" className="mt-2 text-sm text-rose-300">
                  {confirmPasswordError}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-sky-400 px-4 text-base font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/40 border-t-slate-950" />
                  Creating account...
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-sky-400 transition hover:text-sky-300">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
