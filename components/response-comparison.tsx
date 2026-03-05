"use client";

import { useState } from "react";

interface ResponseComparisonProps {
  freeReply: string;
  proReply: string;
  isPro: boolean;
  onUpgradeClick: () => void;
}

export default function ResponseComparison({
  freeReply,
  proReply,
  isPro,
  onUpgradeClick,
}: ResponseComparisonProps) {
  const [showFullPro, setShowFullPro] = useState(isPro);

  // Calculate the character count to show (30-40% of pro reply)
  const proPreviewLength = Math.floor(proReply.length * 0.35); // 35% of content
  const proPreview = proReply.substring(0, proPreviewLength);
  const hiddenContent = proReply.substring(proPreviewLength);

  return (
    <div className="mt-8 space-y-6">
      <div className="border-t border-slate-700 pt-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-100">Response Comparison</h3>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Free Reply Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-300">Free Reply</span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">Your Plan</span>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
              <p className="whitespace-pre-wrap leading-relaxed text-slate-300">{freeReply}</p>
            </div>
          </div>

          {/* Pro Reply Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-300">Pro Optimized Reply</span>
              {!isPro && (
                <span className="rounded-full border border-orange-600/50 bg-orange-900/20 px-2 py-0.5 text-xs text-orange-300">
                  Pro Plan
                </span>
              )}
              {isPro && (
                <span className="rounded-full border border-emerald-600/50 bg-emerald-900/20 px-2 py-0.5 text-xs text-emerald-300">
                  Unlocked
                </span>
              )}
            </div>

            <div className="relative rounded-lg border border-slate-700 bg-slate-900/40 p-4">
              {!isPro && !showFullPro ? (
                <>
                  {/* Preview with blur overlay */}
                  <div className="space-y-4">
                    <p className="whitespace-pre-wrap leading-relaxed text-slate-300">{proPreview}</p>

                    {/* Blur overlay */}
                    <div className="relative">
                      <div className="whitespace-pre-wrap leading-relaxed text-slate-400 blur-md opacity-50">
                        {hiddenContent}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/40 to-slate-900/80" />
                    </div>
                  </div>

                  {/* Overlay message and button */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/30 backdrop-blur-sm">
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-200">
                        Unlock the full optimized reply
                      </p>
                      <p className="mt-1 text-xs text-slate-400">with Pro</p>
                      <button
                        onClick={onUpgradeClick}
                        className="mt-3 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-orange-600 hover:to-orange-700"
                      >
                        Upgrade to Pro
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Full Pro Reply */
                <p className="whitespace-pre-wrap leading-relaxed text-slate-300">{proReply}</p>
              )}
            </div>

            {/* Optimization Notes */}
            <div className="space-y-2 rounded-lg border border-slate-700/50 bg-slate-900/20 p-3 text-xs">
              <p className="font-medium text-slate-400">Pro Optimizations:</p>
              <ul className="space-y-1 text-slate-400">
                <li>✓ Advanced psychological framing</li>
                <li>✓ Strategic word choice & tone refinement</li>
                <li>✓ Power dynamics optimization</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Value Proposition */}
        {!isPro && (
          <div className="mt-6 rounded-lg border border-slate-700 bg-gradient-to-r from-slate-900/50 to-slate-800/50 p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-200">3x</div>
                <p className="mt-1 text-xs text-slate-400">More powerful replies</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-200">∞</div>
                <p className="mt-1 text-xs text-slate-400">Unlimited messages daily</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-200">4</div>
                <p className="mt-1 text-xs text-slate-400">Premium messaging modes</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
