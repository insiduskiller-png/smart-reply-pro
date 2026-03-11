"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (!username || !email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username }),
      });

      const data = await response.json();
      console.log("Register response:", data);

      if (!response.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      setSuccess("Account created. Please confirm your email from the link we sent.");
      setLoading(false);

      setUsername("");
      setEmail("");
      setPassword("");
    } catch (e) {
      console.error("Register error:", e);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="card p-6 md:p-8">
          <h1 className="mb-6 text-2xl font-semibold text-white">Register</h1>

          <form onSubmit={handleRegister} className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="h-12 w-full rounded-md border border-slate-700 bg-slate-950 px-4 text-base text-white placeholder:text-slate-500 disabled:opacity-60 md:h-10 md:px-3 md:text-sm"
              required
              minLength={3}
            />

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="h-12 w-full rounded-md border border-slate-700 bg-slate-950 px-4 text-base text-white placeholder:text-slate-500 disabled:opacity-60 md:h-10 md:px-3 md:text-sm"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="h-12 w-full rounded-md border border-slate-700 bg-slate-950 px-4 text-base text-white placeholder:text-slate-500 disabled:opacity-60 md:h-10 md:px-3 md:text-sm"
              required
              minLength={6}
            />

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-md border-none bg-sky-500 px-4 text-base font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 md:h-10 md:text-sm"
            >
              {loading ? "Creating account..." : "Register"}
            </button>
          </form>

          {error && (
            <div className="mt-4 rounded-md bg-rose-950 p-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-md bg-emerald-950 p-3 text-sm text-emerald-300">
              {success}
            </div>
          )}

          <div className="mt-5 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="text-sky-400 hover:text-sky-300">
              Login here
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
