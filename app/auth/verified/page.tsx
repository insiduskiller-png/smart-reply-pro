import Link from "next/link";

export default function VerifiedPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_52%),linear-gradient(180deg,rgba(15,23,42,0.32),rgba(2,6,23,0))]" />

      <div className="w-full max-w-xl rounded-[1.75rem] border border-slate-800 bg-slate-900/88 p-7 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur md:p-9">
        <div className="mb-6 text-center">
          <div className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
            Email confirmed
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white">Your account is verified</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300 md:text-base">
            You can now continue to sign in and access your Smart Reply Pro workspace.
          </p>
        </div>

        <div className="rounded-xl border border-slate-700/80 bg-slate-950/55 px-4 py-4 text-sm text-slate-300">
          Need help? Reply to{" "}
          <a href="mailto:support@smartreplypro.ai" className="font-medium text-sky-300 hover:text-sky-200">
            support@smartreplypro.ai
          </a>
          .
        </div>

        <div className="mt-6">
          <Link
            href="/login?verified=1"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-sky-400 px-4 text-base font-semibold text-slate-950 transition hover:bg-sky-300"
          >
            Continue to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
