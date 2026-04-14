"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  normalizeUsernamePreset,
  USERNAME_TRANSITION_DURATION_MS,
  type UsernameColorPreset,
} from "@/lib/username-style";

type AnimatedUsernameProps = {
  text: string;
  isPro: boolean;
  colorPreset?: string | null;
  className?: string;
  durationMs?: number;
  previousTheme?: string | null;
  nextTheme?: string | null;
  isTransitioning?: boolean;
  onTransitionStateChange?: (isTransitioning: boolean) => void;
  onTransitionComplete?: () => void;
  /** When true, plays the ink-wash reveal once every time the component mounts. */
  playOnMount?: boolean;
};

function getGradientStops(theme?: string | null): [string, string, string] {
  const normalized = normalizeUsernamePreset(theme);

  if (normalized === "cyan-neon") {
    return ["#67e8f9", "#38bdf8", "#3b82f6"];
  }

  if (normalized === "gold-orange") {
    return ["#fde68a", "#fdba74", "#f97316"];
  }

  return ["#7dd3fc", "#60a5fa", "#a78bfa"];
}

export default function AnimatedUsername({
  text,
  isPro,
  colorPreset,
  className,
  durationMs = USERNAME_TRANSITION_DURATION_MS,
  previousTheme,
  nextTheme,
  isTransitioning,
  onTransitionStateChange,
  onTransitionComplete,
  playOnMount = false,
}: AnimatedUsernameProps) {
  const componentId = useId().replace(/:/g, "");
  const [activePreset, setActivePreset] = useState<UsernameColorPreset>(normalizeUsernamePreset(colorPreset));
  const [previousPreset, setPreviousPreset] = useState<UsernameColorPreset | null>(null);
  const [localTransitioning, setLocalTransitioning] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const previousPresetRef = useRef<UsernameColorPreset>(normalizeUsernamePreset(colorPreset));
  const isControlled = typeof isTransitioning === "boolean";
  const resolvedTransitioning = isControlled ? Boolean(isTransitioning) : localTransitioning;
  const completeNotifiedRef = useRef(false);
  const controlledPrevRef = useRef(false);

  const resolvedActiveTheme = isControlled
    ? normalizeUsernamePreset(nextTheme ?? colorPreset)
    : activePreset;
  const resolvedPreviousTheme = isControlled
    ? normalizeUsernamePreset(previousTheme ?? colorPreset)
    : (previousPreset ?? activePreset);

  const finishTransition = useCallback(() => {
    if (completeNotifiedRef.current) {
      return;
    }

    completeNotifiedRef.current = true;
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!isControlled) {
      setLocalTransitioning(false);
      setPreviousPreset(null);
    }

    onTransitionStateChange?.(false);
    onTransitionComplete?.();
  }, [isControlled, onTransitionComplete, onTransitionStateChange]);

  useEffect(() => {
    if (isControlled) {
      return;
    }

    if (!isPro) {
      setLocalTransitioning(false);
      setPreviousPreset(null);
      const normalizedPreset = normalizeUsernamePreset(colorPreset);
      setActivePreset(normalizedPreset);
      previousPresetRef.current = normalizedPreset;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      return;
    }

    const normalizedPreset = normalizeUsernamePreset(colorPreset);
    if (previousPresetRef.current === normalizedPreset) {
      return;
    }

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    const fromPreset = previousPresetRef.current;
    previousPresetRef.current = normalizedPreset;

    setPreviousPreset(fromPreset);
    setActivePreset(normalizedPreset);
    setLocalTransitioning(true);
    completeNotifiedRef.current = false;
    onTransitionStateChange?.(true);

    timeoutRef.current = window.setTimeout(() => {
      finishTransition();
    }, durationMs);
  }, [colorPreset, durationMs, finishTransition, isControlled, isPro, onTransitionStateChange]);

  useEffect(() => {
    if (!isControlled || !isPro) {
      return;
    }

    const justStarted = isTransitioning && !controlledPrevRef.current;
    const justStopped = !isTransitioning && controlledPrevRef.current;
    controlledPrevRef.current = Boolean(isTransitioning);

    if (justStarted) {
      completeNotifiedRef.current = false;
      onTransitionStateChange?.(true);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        finishTransition();
      }, durationMs);
    }

    if (justStopped) {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      completeNotifiedRef.current = false;
    }
  }, [durationMs, finishTransition, isControlled, isPro, isTransitioning, onTransitionStateChange]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Plays the ink-wash reveal once per mount so the user sees their colour
  // wash in every time they load the page (greeting animation).
  const mountDoneRef = useRef(false);
  useEffect(() => {
    if (!playOnMount || isControlled || !isPro || mountDoneRef.current) {
      return;
    }
    mountDoneRef.current = true;

    const normalizedPreset = normalizeUsernamePreset(colorPreset);
    // Update the tracker first so the colorPreset-change effect doesn't also fire.
    previousPresetRef.current = normalizedPreset;
    // Always animate from "default" so there's a visible ink-wash reveal
    // even when the user's chosen colour is the default blue-purple.
    setPreviousPreset("default");
    setActivePreset(normalizedPreset);
    setLocalTransitioning(true);
    completeNotifiedRef.current = false;

    timeoutRef.current = window.setTimeout(finishTransition, durationMs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro]); // intentionally only re-run when isPro changes (profile loaded)

  const nextStops = useMemo(() => getGradientStops(resolvedActiveTheme), [resolvedActiveTheme]);
  const previousStops = useMemo(() => getGradientStops(resolvedPreviousTheme), [resolvedPreviousTheme]);
  const safeText = text?.trim() || "User";
  const textLength = Math.max(4, safeText.length);
  const widthEm = Math.max(5.5, textLength * 0.68 + 0.8);
  const viewWidth = Math.round(widthEm * 100);
  const viewHeight = 132;

  const oldGradientId = `username-old-gradient-${componentId}`;
  const newGradientId = `username-new-gradient-${componentId}`;
  const textClipId = `username-text-clip-${componentId}`;
  const revealMaskId = `username-reveal-mask-${componentId}`;
  const inkFilterId = `username-ink-filter-${componentId}`;
  const blendFilterId = `username-blend-filter-${componentId}`;

  const staticGradient = `linear-gradient(120deg, ${nextStops[0]} 0%, ${nextStops[1]} 50%, ${nextStops[2]} 100%)`;

  // Always render the same outer element structure — layout never changes between states.
  // Static state: CSS gradient text. Transition state: invisible CSS text holds the layout
  // box while the SVG (position:absolute, taken out of flow) paints the animated gradient.
  //
  // SVG height is calibrated to 1.32em: fontSize(100) / viewHeight(132) × 1.32em = 1.0em,
  // which exactly matches the CSS font-size so both representations are the same visual size.
  return (
    <span
      className={className}
      style={{
        // inline-block in BOTH states: gives a well-defined containing block so the
        // absolutely-positioned SVG can resolve width/height relative to this span.
        display: "inline-block",
        position: "relative",
        backgroundImage: resolvedTransitioning ? undefined : staticGradient,
        backgroundClip: resolvedTransitioning ? undefined : "text",
        WebkitBackgroundClip: resolvedTransitioning ? undefined : "text",
        color: "transparent",
        WebkitTextFillColor: "transparent",
      }}
    >
      {safeText}
      {resolvedTransitioning && (
        <svg
          aria-hidden="true"
          style={{
            position: "absolute",
            // Centre vertically so the SVG text baseline aligns with the CSS text baseline.
            top: "50%",
            left: 0,
            transform: "translateY(-50%)",
            width: `${widthEm}em`,
            // 1.32em = viewHeight(132) / fontSize(100) * 1em — makes SVG text = 1× CSS font-size.
            height: "1.32em",
            overflow: "visible",
            pointerEvents: "none",
          }}
          viewBox={`0 0 ${viewWidth} ${viewHeight}`}
          preserveAspectRatio="xMinYMid meet"
        >
        <defs>
          <linearGradient id={oldGradientId} x1="0%" y1="10%" x2="100%" y2="90%">
            <stop offset="0%" stopColor={previousStops[0]} />
            <stop offset="52%" stopColor={previousStops[1]} />
            <stop offset="100%" stopColor={previousStops[2]} />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              values="0 0; 0.06 -0.04; -0.04 0.05; 0 0"
              dur={`${durationMs}ms`}
              fill="freeze"
            />
          </linearGradient>

          <linearGradient id={newGradientId} x1="0%" y1="10%" x2="100%" y2="90%">
            <stop offset="0%" stopColor={nextStops[0]} />
            <stop offset="52%" stopColor={nextStops[1]} />
            <stop offset="100%" stopColor={nextStops[2]} />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              values="-0.06 0.03; 0.04 -0.02; 0.09 0.05; 0 0"
              dur={`${durationMs}ms`}
              fill="freeze"
            />
          </linearGradient>

          <clipPath id={textClipId}>
            <text
              x="0"
              y="98"
              fontSize="100"
              fontWeight="700"
              fontFamily="inherit"
              letterSpacing="0"
            >
              {safeText}
            </text>
          </clipPath>

          <filter id={inkFilterId} x="-25%" y="-30%" width="150%" height="170%" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.015 0.022"
              numOctaves="2"
              seed="7"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                values="0.015 0.022;0.02 0.03;0.013 0.019;0.019 0.027;0.016 0.022"
                dur={`${durationMs}ms`}
                fill="freeze"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="26" xChannelSelector="R" yChannelSelector="G">
              <animate
                attributeName="scale"
                values="6;20;28;19;7"
                dur={`${durationMs}ms`}
                fill="freeze"
              />
            </feDisplacementMap>
            <feGaussianBlur stdDeviation="7">
              <animate
                attributeName="stdDeviation"
                values="5;9;11;8;5"
                dur={`${durationMs}ms`}
                fill="freeze"
              />
            </feGaussianBlur>
          </filter>

          <filter id={blendFilterId} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="soft" />
            <feColorMatrix
              in="soft"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 1.02 0"
            />
          </filter>

          <mask id={revealMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width={viewWidth} height={viewHeight}>
            <rect x="0" y="0" width={viewWidth} height={viewHeight} fill="black" />

            <g filter={`url(#${inkFilterId})`}>
              <ellipse cx={viewWidth * 0.22} cy={viewHeight * 0.28} rx="0" ry="0" fill="white" opacity="0.95">
                <animate attributeName="rx" values="0;24;80;130;185" keyTimes="0;0.14;0.42;0.74;1" dur={`${durationMs}ms`} fill="freeze" />
                <animate attributeName="ry" values="0;20;64;104;146" keyTimes="0;0.14;0.42;0.74;1" dur={`${durationMs}ms`} fill="freeze" />
                <animate attributeName="cy" values={`${viewHeight * 0.2};${viewHeight * 0.31};${viewHeight * 0.39};${viewHeight * 0.52};${viewHeight * 0.58}`} dur={`${durationMs}ms`} fill="freeze" />
              </ellipse>

              <ellipse cx={viewWidth * 0.66} cy={viewHeight * 0.56} rx="0" ry="0" fill="white" opacity="0.7">
                <animate attributeName="rx" values="0;8;45;94;142" keyTimes="0;0.22;0.5;0.8;1" dur={`${durationMs}ms`} fill="freeze" />
                <animate attributeName="ry" values="0;8;38;74;108" keyTimes="0;0.22;0.5;0.8;1" dur={`${durationMs}ms`} fill="freeze" />
                <animate attributeName="cx" values={`${viewWidth * 0.6};${viewWidth * 0.63};${viewWidth * 0.7};${viewWidth * 0.74};${viewWidth * 0.77}`} dur={`${durationMs}ms`} fill="freeze" />
              </ellipse>

              <ellipse cx={viewWidth * 0.4} cy={viewHeight * 0.78} rx="0" ry="0" fill="white" opacity="0.6">
                <animate attributeName="rx" values="0;4;26;63;110" keyTimes="0;0.3;0.58;0.82;1" dur={`${durationMs}ms`} fill="freeze" />
                <animate attributeName="ry" values="0;4;20;48;86" keyTimes="0;0.3;0.58;0.82;1" dur={`${durationMs}ms`} fill="freeze" />
                <animate attributeName="cy" values={`${viewHeight * 0.73};${viewHeight * 0.71};${viewHeight * 0.68};${viewHeight * 0.63};${viewHeight * 0.6}`} dur={`${durationMs}ms`} fill="freeze" />
              </ellipse>
            </g>

            <rect x="0" y="0" width={viewWidth} height={viewHeight} fill="white" opacity="0">
              <animate
                attributeName="opacity"
                values="0;0.05;0.16;0.38;0.72;1"
                keyTimes="0;0.2;0.42;0.66;0.88;1"
                dur={`${durationMs}ms`}
                fill="freeze"
              />
            </rect>
          </mask>
        </defs>

        <g clipPath={`url(#${textClipId})`} filter={`url(#${blendFilterId})`}>
          <rect x="0" y="0" width={viewWidth} height={viewHeight} fill={`url(#${oldGradientId})`} />
          <rect
            x="0"
            y="0"
            width={viewWidth}
            height={viewHeight}
            fill={`url(#${newGradientId})`}
            mask={`url(#${revealMaskId})`}
            onAnimationEnd={finishTransition}
          />
        </g>
      </svg>
      )}
    </span>
  );
}
