"use client";

import { useEffect, useState } from "react";
import { quotes } from "@/lib/quotes";

export default function RotatingInsight() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % quotes.length);
        setVisible(true);
      }, 300);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="mt-10 rounded-lg border border-slate-700 bg-slate-900/50 p-6">
      <h2 className="text-lg font-semibold text-sky-200">Strategic Communication Insight</h2>
      <p
        className={`mt-3 text-slate-200 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        “{quotes[index]}”
      </p>
    </section>
  );
}
