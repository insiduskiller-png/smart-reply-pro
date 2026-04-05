"use client";

import Link from "next/link";
import { useState } from "react";
import { PRO_WAITLIST_HREF } from "@/lib/billing";

interface UsageProgressMeterProps {
  messagesUsed: number;
  limit: number;
}

export default function UsageProgressMeter({ messagesUsed, limit }: UsageProgressMeterProps) {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const percentage = Math.min((messagesUsed / limit) * 100, 100);
  const isAtLimit = messagesUsed >= limit;

  const handleUpgrade = () => {
    setIsUpgradeModalOpen(true);
  };

  return (
    <div className="mb-8 space-y-4">
      {/* Progress Meter Card */}
      <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">Messages used today</span>
          <span className="text-sm font-semibold text-slate-200">
            {messagesUsed} / {limit}
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-800">
          {/* Progress Fill */}
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isAtLimit
                ? "bg-gradient-to-r from-red-500 to-red-600"
                : "bg-gradient-to-r from-blue-500 to-cyan-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Warning Message */}
        {isAtLimit && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-red-950/40 px-3 py-2 text-sm text-red-300">
            <svg
              className="h-4 w-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4v2m0-14C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6h1.5V9z"
              />
            </svg>
            <span className="font-medium">You reached your free limit.</span>
          </div>
        )}
      </div>

      {/* CTA Button */}
      <button
        onClick={handleUpgrade}
        className={`w-full rounded-lg px-4 py-3 font-medium transition-all duration-200 ${
          isAtLimit
            ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/20"
            : "border border-slate-600 text-slate-300 hover:border-slate-500 hover:text-slate-200"
        }`}
      >
        {isAtLimit ? (
          <>
            <div className="text-base font-semibold">Pro Waitlist</div>
            <div className="text-xs opacity-90">Get notified when advanced tiers launch</div>
          </>
        ) : (
          <>
            <div className="text-sm">Interested in Pro?</div>
            <div className="text-xs opacity-75">Learn what's planned for next</div>
          </>
        )}
      </button>

      {/* Upgrade Modal */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Pro Launch Coming</h2>
              <p className="mt-2 text-sm text-slate-400">
                We're preparing the next tier with advanced features. Join the waitlist to get notified when it's ready.
              </p>
            </div>

            {/* Features */}
            <div className="mb-8 space-y-3">
              {[
                "More reply profiles",
                "Stronger rewrite options",
                "Advanced analysis & insights",
                "Priority access when Pro launches",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-slate-300">{feature}</span>
                </div>
              ))}
            </div>

            {/* Price */}
            <div className="mb-8 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-center">
              <div className="text-xl font-bold text-white">Not purchasable yet</div>
              <div className="text-xs text-slate-400">Checkout stays disabled until the Pro release is ready</div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Link
                href={PRO_WAITLIST_HREF}
                className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 text-center font-semibold text-white transition-all hover:from-orange-600 hover:to-orange-700"
              >
                Join Waitlist
              </Link>
              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                className="w-full rounded-lg border border-slate-600 px-4 py-3 font-medium text-slate-300 transition-all hover:border-slate-500 hover:text-slate-200"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
