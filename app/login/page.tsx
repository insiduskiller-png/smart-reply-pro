"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      setError("Login failed. Check your credentials.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <form className="card space-y-4 p-6" onSubmit={onSubmit}>
        <h1 className="text-2xl font-semibold">Login</h1>
        <input className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2" placeholder="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2" placeholder="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <button className="w-full rounded-md bg-sky-500 px-3 py-2 font-medium text-slate-950" type="submit">Sign in</button>
      </form>
    </main>
  );
}
