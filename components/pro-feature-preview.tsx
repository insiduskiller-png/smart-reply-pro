"use client";

import { useState } from "react";

interface ProFeaturePreviewProps {
  isPro: boolean;
  onUpgradeClick: () => void;
}

interface Feature {
  id: string;
  name: string;
  description: string;
}

const proFeatures: Feature[] = [
  {
    id: "psychological",
    name: "Psychological Persuasion",
    description: "Master advanced persuasion techniques",
  },
  {
    id: "high-status",
    name: "High-Status Reply",
    description: "Project confidence and authority",
  },
  {
    id: "silence",
    name: "Strategic Silence",
    description: "Know when saying nothing is powerful",
  },
  {
    id: "memory",
    name: "Advanced Conversation Memory",
    description: "AI remembers conversation context",
  },
];

export default function ProFeaturePreview({ isPro, onUpgradeClick }: ProFeaturePreviewProps) {
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  const handleFeatureClick = (feature: Feature) => {
    if (!isPro) {
      setSelectedFeature(feature);
      setShowLockedModal(true);
    }
  };

  return (
    <>
      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-semibold text-slate-100">Pro Messaging Modes</h3>

        {/* Features Grid */}
        <div className="grid gap-3">
          {proFeatures.map((feature) => (
            <button
              key={feature.id}
              onClick={() => handleFeatureClick(feature)}
              disabled={isPro}
              className={`group relative overflow-hidden rounded-lg border p-4 transition-all ${
                isPro
                  ? "border-emerald-700/50 bg-emerald-900/20 cursor-default hover:border-emerald-600 hover:bg-emerald-900/30"
                  : "border-slate-700 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60 cursor-pointer"
              }`}
            >
              {/* Background gradient overlay */}
              {!isPro && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-slate-700/10 opacity-0 transition-opacity group-hover:opacity-100" />
              )}

              <div className="relative flex items-start justify-between gap-3">
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    {isPro ? (
                      <span className="text-emerald-400">✓</span>
                    ) : (
                      <span className="text-slate-500">🔒</span>
                    )}
                    <h4 className={`font-medium ${isPro ? "text-emerald-300" : "text-slate-300"}`}>
                      {feature.name}
                    </h4>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{feature.description}</p>
                </div>

                {!isPro && (
                  <div className="flex-shrink-0 text-xs font-medium text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
                    Click to learn
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {!isPro && (
          <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-center">
            <p className="text-sm text-slate-400">
              Unlock all Pro features and get <span className="font-semibold text-slate-300">1000 messages/day</span>
            </p>
            <button
              onClick={onUpgradeClick}
              className="mt-3 w-full rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-orange-600 hover:to-orange-700"
            >
              Upgrade to Pro
            </button>
          </div>
        )}

        {isPro && (
          <div className="rounded-lg border border-emerald-700/50 bg-emerald-900/20 p-4 text-center">
            <p className="text-sm text-emerald-300">
              ✓ All Pro features unlocked!
            </p>
          </div>
        )}
      </div>

      {/* Locked Feature Modal */}
      {showLockedModal && selectedFeature && !isPro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <div className="mb-4 text-4xl">🔒</div>
              <h2 className="text-2xl font-bold text-white">Feature Locked</h2>
            </div>

            <div className="mb-8 text-center">
              <p className="mb-3 text-lg font-semibold text-slate-200">{selectedFeature.name}</p>
              <p className="text-sm text-slate-400">
                This feature is available in SmartReplyPro.
              </p>
              <p className="mt-3 text-xs text-slate-500">
                {selectedFeature.description}
              </p>
            </div>

            {/* Pro Benefits */}
            <div className="mb-8 space-y-2">
              <p className="text-xs font-medium text-slate-400">Pro includes:</p>
              {[
                "Unlock all 4 Pro Messaging Modes",
                "1000 messages per day",
                "3 reply variations per message",
                "Advanced power scoring",
                "Conversation memory",
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2 text-xs text-slate-300">
                  <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            {/* Price */}
            <div className="mb-8 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-center">
              <div className="text-2xl font-bold text-white">€5.50</div>
              <div className="text-xs text-slate-400">per month, billed monthly</div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={onUpgradeClick}
                className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 font-semibold text-white transition-all hover:from-orange-600 hover:to-orange-700"
              >
                Upgrade to Pro
              </button>
              <button
                onClick={() => {
                  setShowLockedModal(false);
                  setSelectedFeature(null);
                }}
                className="w-full rounded-lg border border-slate-600 px-4 py-3 font-medium text-slate-300 transition-all hover:border-slate-500 hover:text-slate-200"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
