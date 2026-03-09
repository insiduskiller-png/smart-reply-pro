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
              Pro features coming soon
            </p>
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

      {/* Locked Feature Modal - Hidden until Pro is available */}
      {false && showLockedModal && selectedFeature && !isPro && (
        <></>
      )}
    </>
  );
}
