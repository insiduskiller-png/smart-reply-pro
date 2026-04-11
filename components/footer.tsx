import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-950/95 py-12 md:py-16 text-slate-400 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr_1fr]">
          {/* Brand, Mission & Values */}
          <div>
            <p className="font-bold text-lg tracking-tight text-white">Smart Reply Pro</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">Strategic AI communication workspace. Built for high-stakes replies that stay calm, sharp, and in control.</p>
            <p className="mt-4 text-xs text-slate-500">© {currentYear} Smart Reply Pro. All rights reserved.</p>
          </div>

          {/* Legal & Policy */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Trust & Policy</p>
            <div className="space-y-2 text-sm">
              <Link
                href="/privacy"
                className="block transition hover:text-sky-300"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="block transition hover:text-sky-300"
              >
                Terms of Use
              </Link>
            </div>
          </div>

          {/* Get in Touch */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Questions?</p>
            <div className="space-y-2">
              <a
                href="mailto:support@smartreplypro.ai?subject=Smart Reply Pro Support"
                className="block text-sm font-medium text-sky-300 transition hover:text-sky-200"
              >
                Contact Us
              </a>
              <p className="text-xs text-slate-500">support@smartreplypro.ai</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-8 border-t border-slate-800" />

        {/* Trust & Transparency Footer */}
        <div className="mt-8 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-xs text-slate-400">
              <p className="font-semibold text-sky-300">AI Responsibility</p>
              <p className="mt-1">All replies are AI-generated. You review them before sending—we never post on your behalf.</p>
            </div>
            <div className="text-xs text-slate-400">
              <p className="font-semibold text-sky-300">Your Control</p>
              <p className="mt-1">You choose what to send. You own your account data. You&apos;re always in charge of your messages.</p>
            </div>
            <div className="text-xs text-slate-400">
              <p className="font-semibold text-sky-300">Privacy First</p>
              <p className="mt-1">We process messages only to generate suggestions. See our Privacy Policy for full details.</p>
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div className="mt-8 text-center text-xs text-slate-500 border-t border-slate-800/50 pt-6">
          Communication with intent. Built for trust.
        </div>
      </div>
    </footer>
  );
}
