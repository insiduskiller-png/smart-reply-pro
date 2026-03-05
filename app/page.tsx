import RotatingInsight from "@/components/rotating-insight";
import UserStatusBadge from "@/components/UserStatusBadge";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <section className="card p-10">
        <div className="mb-4 flex items-start justify-between gap-4">
          <p className="text-xs uppercase tracking-[0.2em] text-sky-400">Professional intelligence software</p>
          <UserStatusBadge />
        </div>
        <h1 className="text-5xl font-bold tracking-tight">Write strategic responses with leverage.</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Smart Reply Pro analyzes tone, pressure, and manipulation signals so you can respond with confidence.
        </p>
      </section>

      <RotatingInsight />
    </main>
  );
}
