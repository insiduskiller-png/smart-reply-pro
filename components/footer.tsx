import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-8 text-slate-400">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:gap-0">
          {/* Brand & Copyright */}
          <div className="text-center md:text-left">
            <p className="font-semibold text-slate-200">Smart Reply Pro</p>
            <p className="mt-1 text-xs">© {currentYear} All rights reserved.</p>
          </div>

          {/* Links */}
          <div className="flex gap-6 text-sm">
            <Link
              href="/privacy"
              className="transition hover:text-sky-400"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="transition hover:text-sky-400"
            >
              Terms of Use
            </Link>
            <a
              href="mailto:support@smartreplypo.com"
              className="transition hover:text-sky-400"
            >
              Contact
            </a>
          </div>
        </div>

        {/* Divider & Tagline */}
        <div className="mt-6 border-t border-slate-800 pt-4 text-center text-xs text-slate-500">
          Strategic AI communication workspace
        </div>
      </div>
    </footer>
  );
}
