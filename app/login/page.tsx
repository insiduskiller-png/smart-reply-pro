"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("Login response:", data);

      if (!response.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      if (data.success) {
        if (data.sessionToken && data.refreshToken) {
          try {
            await supabaseBrowser.auth.setSession({
              access_token: data.sessionToken,
              refresh_token: data.refreshToken,
            });
          } catch {
            // Keep server-cookie auth flow working even if client session sync fails
          }
        }

        setLoading(false);
        router.replace("/dashboard");
      }
    } catch (e) {
      console.error("Login error:", e);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="card p-6 md:p-8">
          <h1 className="mb-6 text-2xl font-semibold text-white">Login</h1>
          
          <form onSubmit={handleLogin} className="space-y-4">
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
            />
            
            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-md border-none bg-sky-500 px-4 text-base font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 md:h-10 md:text-sm"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          
          {error && (
            <div className="mt-4 rounded-md bg-rose-950 p-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div className="mt-5 text-center text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-sky-400 hover:text-sky-300">
              Register here
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
