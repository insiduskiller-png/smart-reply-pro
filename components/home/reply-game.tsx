"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { replyGameScenarios, type ReplyGameScenario } from "@/lib/reply-game-scenarios";

type Choice = "a" | "b";

function randomScenario(excludeIds: string[]): ReplyGameScenario | null {
  const pool = replyGameScenarios.filter((scenario) => !excludeIds.includes(scenario.id));

  if (pool.length === 0) {
    return null;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

function getScoreLabel(score: number): "Reactive" | "Balanced" | "Strategic" {
  if (score >= 20) return "Strategic";
  if (score >= 10) return "Balanced";
  return "Reactive";
}

export default function ReplyGame() {
  const [currentScenario, setCurrentScenario] = useState<ReplyGameScenario | null>(null);
  const [usedScenarioIds, setUsedScenarioIds] = useState<string[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [score, setScore] = useState(0);
  const [completedRounds, setCompletedRounds] = useState(0);

  useEffect(() => {
    const first = randomScenario([]);
    if (!first) return;
    setCurrentScenario(first);
    setUsedScenarioIds([first.id]);
  }, []);

  const result = useMemo(() => {
    if (!currentScenario || !selectedChoice) return null;

    return selectedChoice === "a"
      ? {
          title: currentScenario.outcome_a_title,
          description: currentScenario.outcome_a_description,
        }
      : {
          title: currentScenario.outcome_b_title,
          description: currentScenario.outcome_b_description,
        };
  }, [currentScenario, selectedChoice]);

  const handleChoice = (choice: Choice) => {
    if (!currentScenario || selectedChoice) return;

    setSelectedChoice(choice);
    setCompletedRounds((prev) => prev + 1);
    setScore((prev) => prev + (choice === currentScenario.best_choice ? 10 : 4));
  };

  const handleNextScenario = () => {
    if (!currentScenario) return;

    const next = randomScenario(usedScenarioIds);

    if (next) {
      setCurrentScenario(next);
      setUsedScenarioIds((prev) => [...prev, next.id]);
      setSelectedChoice(null);
      return;
    }

    const fallback = randomScenario([currentScenario.id]);
    if (fallback) {
      setCurrentScenario(fallback);
      setUsedScenarioIds([currentScenario.id, fallback.id]);
      setSelectedChoice(null);
    }
  };

  const showCta = completedRounds >= 3;
  const strongerCta = completedRounds >= 5;
  const scoreLabel = getScoreLabel(score);

  if (!currentScenario) {
    return (
      <section className="card mx-auto w-full max-w-3xl p-6 md:p-8">
        <p className="text-slate-300">Loading your first scenario...</p>
      </section>
    );
  }

  return (
    <section className="card mx-auto w-full max-w-3xl p-5 md:p-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-xs font-medium text-slate-200">
          {currentScenario.category}
        </span>
        <div className="text-right">
          <p className="text-sm font-medium text-sky-300">Conversation Score: {score}</p>
          <p className="text-xs text-slate-400">{scoreLabel}</p>
        </div>
      </div>

      <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Reply Game</p>
      <h2 className="mt-2 text-lg font-medium text-slate-100 md:text-xl">{currentScenario.intro_line}</h2>
      <p className="mt-3 rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-base text-slate-200 md:text-lg">
        “{currentScenario.incoming_message}”
      </p>

      <div className="mt-4 grid gap-3">
        <button
          type="button"
          onClick={() => handleChoice("a")}
          disabled={Boolean(selectedChoice)}
          className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-all duration-200 md:text-base ${
            selectedChoice === "a"
              ? "border-sky-400 bg-sky-500/15 text-sky-100"
              : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
          } ${selectedChoice ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">Option A</span>
          {currentScenario.option_a}
        </button>

        <button
          type="button"
          onClick={() => handleChoice("b")}
          disabled={Boolean(selectedChoice)}
          className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-all duration-200 md:text-base ${
            selectedChoice === "b"
              ? "border-sky-400 bg-sky-500/15 text-sky-100"
              : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500 hover:bg-slate-800/80"
          } ${selectedChoice ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">Option B</span>
          {currentScenario.option_b}
        </button>
      </div>

      {selectedChoice && result ? (
        <div className="mt-5 space-y-4 border-t border-slate-800 pt-5">
          <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-4">
            <p className="text-sm font-semibold text-slate-100">{result.title}</p>
            <p className="mt-1 text-sm text-slate-300">{result.description}</p>
          </div>

          <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-sky-300">Smart Reply Pro Suggestion</p>
            <p className="mt-2 text-sm text-sky-100 md:text-base">{currentScenario.smartreply_suggestion}</p>
          </div>

          {showCta ? (
            <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-4">
              <h3 className="text-base font-semibold text-white md:text-lg">
                {strongerCta
                  ? "Smart Reply Pro does this for your real messages in seconds."
                  : "Want better replies for your real conversations?"}
              </h3>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-md bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                >
                  Create Free Account
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-400"
                >
                  Sign In
                </Link>
              </div>
            </div>
          ) : null}

          <div className="sticky bottom-3 z-10">
            <button
              type="button"
              onClick={handleNextScenario}
              className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 md:text-base"
            >
              Next Scenario
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
