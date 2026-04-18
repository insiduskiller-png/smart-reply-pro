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
  title: "Smart Reply Pro | Strategic AI for Every Reply",
  description: "Generate confident, contextual replies instantly. Strategic AI communication workspace that reads tone, pressure, and intent—Free now, Pro coming soon.",
  metadataBase: new URL("https://www.smartreplypro.ai"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: "https://www.smartreplypro.ai",
    type: "website",
    siteName: "Smart Reply Pro",
    title: "Smart Reply Pro | Strategic AI for Every Reply",
    description: "Generate confident, contextual replies instantly. Strategic AI communication workspace that reads tone, pressure, and intent.",
    images: [
      {
        url: "https://www.smartreplypro.ai/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Smart Reply Pro - Strategic AI Communication",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Smart Reply Pro | Strategic AI for Every Reply",
    description: "Generate confident, contextual replies instantly. Strategic AI communication workspace.",
    creator: "@smartreplypro",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Smart Reply Pro",
    description: "Strategic AI communication workspace that generates confident, contextual replies instantly",
    url: "https://www.smartreplypro.ai",
    applicationCategory: "Productivity",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: "Free forever plan available now",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "100",
    },
    author: {
      "@type": "Organization",
      name: "Smart Reply Pro",
      url: "https://www.smartreplypro.ai",
    },
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-slate-950 text-slate-100 antialiased">
        <AuthProvider>
          {/* Desktop Header */}
          <header className="hidden border-b border-slate-800 bg-slate-950/90 backdrop-blur md:block">
            <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/" className="flex items-center gap-2">
                <img src="/srp-icon.png" alt="Smart Reply Pro" className="h-14 w-auto mix-blend-screen" />
                <span className="text-xl font-semibold tracking-tight text-slate-100">Smart Reply Pro</span>
              </Link>

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
