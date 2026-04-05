"use client";

import Link from "next/link";
import { useState } from "react";
import { PRO_ENABLED, PRO_WAITLIST_HREF } from "@/lib/billing";

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
  const isProAvailable = PRO_ENABLED;

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
              {isProAvailable ? "Pro features available with Pro access" : "Pro features are being prepared for a later release"}
            </p>
            {!isProAvailable ? (
              <Link href={PRO_WAITLIST_HREF} className="mt-3 inline-flex text-sm font-medium text-sky-300 hover:text-sky-200">
                Join Waitlist
              </Link>
            ) : null}
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

      {showLockedModal && selectedFeature && !isPro ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h4 className="text-lg font-semibold text-white">{selectedFeature.name}</h4>
            <p className="mt-2 text-sm text-slate-400">{selectedFeature.description}</p>
            <p className="mt-4 text-sm text-slate-300">
              {isProAvailable
                ? "This feature is available with Pro access."
                : "This feature is part of the upcoming Pro release and is not active during the free public launch."}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              {!isProAvailable ? (
                <Link href={PRO_WAITLIST_HREF} className="rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-300">
                  Get notified
                </Link>
              ) : (
                <button
                  type="button"
                  className="rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-300"
                  onClick={onUpgradeClick}
                >
                  Learn More
                </button>
              )}
              <button
                type="button"
                className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                onClick={() => setShowLockedModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
