"use client";

import { useEffect } from "react";
import ReplyGame from "@/components/home/reply-game";
import { trackHomepageVisit } from "@/lib/analytics";

export default function Home() {
  useEffect(() => {
    trackHomepageVisit().catch(err => console.debug("Failed to track homepage visit:", err));
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-14">
      <section className="mb-6 p-2 md:p-0">
        <p className="text-xs uppercase tracking-[0.2em] text-sky-400">SMART REPLY PRO</p>
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">See what your reply really does.</h1>
        <p className="mt-4 max-w-2xl text-base text-slate-300 md:text-lg">
          Choose a response. Watch the outcome. Discover the stronger move.
        </p>
      </section>

      <ReplyGame />
    </main>
  );
}
