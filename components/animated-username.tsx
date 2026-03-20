"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  getUsernameGradientClass,
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
  onTransitionStateChange?: (isTransitioning: boolean) => void;
  onTransitionComplete?: () => void;
};

export default function AnimatedUsername({
  text,
  isPro,
  colorPreset,
  className,
  durationMs = USERNAME_TRANSITION_DURATION_MS,
  onTransitionStateChange,
  onTransitionComplete,
}: AnimatedUsernameProps) {
  const normalizedPreset = normalizeUsernamePreset(colorPreset);
  const [activePreset, setActivePreset] = useState<UsernameColorPreset>(normalizedPreset);
  const [previousPreset, setPreviousPreset] = useState<UsernameColorPreset | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const previousPresetRef = useRef<UsernameColorPreset>(normalizedPreset);

  const finishTransition = useMemo(
    () => () => {
      setIsTransitioning((wasTransitioning) => {
        if (!wasTransitioning) {
          return wasTransitioning;
        }

        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        setPreviousPreset(null);
        onTransitionStateChange?.(false);
        onTransitionComplete?.();
        return false;
      });
    },
    [onTransitionComplete, onTransitionStateChange],
  );

  useEffect(() => {
    if (!isPro) {
      setIsTransitioning(false);
      setPreviousPreset(null);
      setActivePreset(normalizedPreset);
      previousPresetRef.current = normalizedPreset;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      return;
    }

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
    setIsTransitioning(true);
    onTransitionStateChange?.(true);

    timeoutRef.current = window.setTimeout(() => {
      finishTransition();
    }, durationMs);
  }, [durationMs, finishTransition, isPro, normalizedPreset, onTransitionStateChange]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const currentGradientClass = useMemo(() => getUsernameGradientClass(activePreset), [activePreset]);
  const previousGradientClass = useMemo(
    () => getUsernameGradientClass(previousPreset || activePreset),
    [activePreset, previousPreset],
  );

  if (!isPro) {
    return <span className={className}>{text}</span>;
  }

  if (!isTransitioning) {
    return (
      <span className={`username-text-clip ${currentGradientClass} ${className ?? ""}`.trim()}>
        {text}
      </span>
    );
  }

  return (
    <span className={`username-liquid ${className ?? ""}`.trim()}>
      <span className={`username-liquid-layer username-liquid-previous username-text-clip ${previousGradientClass}`}>
        {text}
      </span>
      <span
        className={`username-liquid-layer username-liquid-current username-text-clip ${currentGradientClass} username-liquid-fill`}
        style={{ "--username-liquid-duration": `${durationMs}ms` } as CSSProperties}
        onAnimationEnd={finishTransition}
      >
        {text}
      </span>
    </span>
  );
}
