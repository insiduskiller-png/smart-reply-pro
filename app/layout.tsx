import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import RecoveryHashRedirect from "@/components/auth/recovery-hash-redirect";

export const metadata: Metadata = {
  title: "Smart Reply Pro",
  description: "Strategic AI communication workspace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">
        <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">Smart Reply Pro</Link>
            <div className="flex gap-4 text-sm text-slate-300">
              <Link href="/pricing">Pricing</Link>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/login">Login</Link>
            </div>
          </nav>
        </header>
        <RecoveryHashRedirect />
        {children}
      </body>
    </html>
  );
}
