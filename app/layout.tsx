import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import RecoveryHashRedirect from "@/components/auth/recovery-hash-redirect";
import NavbarUser from "@/components/navbar-user";
import MobileNav from "@/components/mobile-nav";
import DesktopNavCenter from "@/components/desktop-nav-center";
import Footer from "@/components/footer";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "Smart Reply Pro",
  description: "Strategic AI communication workspace",
  metadataBase: new URL("https://www.smartreplypro.ai"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: "https://www.smartreplypro.ai",
    siteName: "Smart Reply Pro",
    title: "Smart Reply Pro",
    description: "Strategic AI communication workspace",
  },
  twitter: {
    card: "summary_large_image",
    title: "Smart Reply Pro",
    description: "Strategic AI communication workspace",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">
        <AuthProvider>
          {/* Desktop Header */}
          <header className="hidden border-b border-slate-800 bg-slate-950/90 backdrop-blur md:block">
            <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-lg font-semibold tracking-tight text-slate-100">Smart Reply Pro</Link>

              <DesktopNavCenter />

              <div className="text-sm text-slate-300">
                <NavbarUser />
              </div>
            </nav>
          </header>
          
          {/* Mobile Navigation */}
          <MobileNav />
          
          <RecoveryHashRedirect />
          
          {/* Main Content */}
          <div className="flex min-h-screen flex-col">
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
