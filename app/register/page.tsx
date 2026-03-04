"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
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

      setSuccess("Registration successful! Redirecting to login...");
      setLoading(false);
      
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (e) {
      console.error("Register error:", e);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" }}>
      <div style={{ maxWidth: 400, width: "100%", padding: "20px" }}>
        <div style={{ backgroundColor: "#1e293b", padding: "30px", borderRadius: "8px", border: "1px solid #334155" }}>
          <h1 style={{ marginTop: 0, marginBottom: "24px", color: "#fff", fontSize: "24px", fontWeight: "600" }}>Register</h1>

          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              minLength={3}
            />

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
              minLength={6}
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
              {loading ? "Creating account..." : "Register"}
            </button>
          </form>

          {error && (
            <div style={{ marginTop: "16px", padding: "10px 12px", backgroundColor: "#7f1d1d", borderRadius: "6px", color: "#fca5a5", fontSize: "14px" }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ marginTop: "16px", padding: "10px 12px", backgroundColor: "#15803d", borderRadius: "6px", color: "#bbf7d0", fontSize: "14px" }}>
              {success}
            </div>
          )}

          <div style={{ marginTop: "20px", textAlign: "center", fontSize: "14px", color: "#94a3b8" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#0ea5e9", textDecoration: "none" }}>
              Login here
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
