"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
        setLoading(false);
        // Dispatch event so navbar can refetch user session
        window.dispatchEvent(new Event("userLoggedIn"));
        setTimeout(() => {
          router.push("/dashboard");
        }, 100);
      }
    } catch (e) {
      console.error("Login error:", e);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" }}>
      <div style={{ maxWidth: 400, width: "100%", padding: "20px" }}>
        <div style={{ backgroundColor: "#1e293b", padding: "30px", borderRadius: "8px", border: "1px solid #334155" }}>
          <h1 style={{ marginTop: 0, marginBottom: "24px", color: "#fff", fontSize: "24px", fontWeight: "600" }}>Login</h1>
          
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #475569",
                backgroundColor: "#0f172a",
                color: "#fff",
                fontSize: "14px",
                fontFamily: "inherit",
                opacity: loading ? 0.6 : 1,
              }}
              required
            />
            
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #475569",
                backgroundColor: "#0f172a",
                color: "#fff",
                fontSize: "14px",
                fontFamily: "inherit",
                opacity: loading ? 0.6 : 1,
              }}
              required
            />
            
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 16px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#0ea5e9",
                color: "#0f172a",
                fontSize: "14px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          
          {error && (
            <div style={{ marginTop: "16px", padding: "10px 12px", backgroundColor: "#7f1d1d", borderRadius: "6px", color: "#fca5a5", fontSize: "14px" }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: "20px", textAlign: "center", fontSize: "14px", color: "#94a3b8" }}>
            Don't have an account?{" "}
            <Link href="/register" style={{ color: "#0ea5e9", textDecoration: "none" }}>
              Register here
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
