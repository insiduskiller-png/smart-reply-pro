import ReplyGame from "@/components/home/reply-game";
import UserStatusBadge from "@/components/UserStatusBadge";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-14">
      <section className="mb-6 card p-6 md:p-8">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
          <p className="text-xs uppercase tracking-[0.2em] text-sky-400">Smart Reply Pro</p>
          <UserStatusBadge />
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">See what your reply really does.</h1>
        <p className="mt-4 max-w-2xl text-base text-slate-300 md:text-lg">
          Choose a reply. See the outcome. Learn what Smart Reply Pro would do better.
        </p>
      </section>

      <ReplyGame />
    </main>
  );
}
