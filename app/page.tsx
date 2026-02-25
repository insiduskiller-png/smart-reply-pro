import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <section className="card p-10">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-sky-400">Professional intelligence software</p>
        <h1 className="text-5xl font-bold tracking-tight">Write strategic responses with leverage.</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Smart Reply Pro analyzes tone, pressure, and manipulation signals so you can respond with confidence.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/dashboard" className="rounded-md bg-sky-500 px-4 py-2 font-medium text-slate-950">Start free</Link>
          <Link href="/pricing" className="rounded-md border border-slate-700 px-4 py-2">View pricing</Link>
        </div>
      </section>
    </main>
  );
}
