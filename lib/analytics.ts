/**
 * Lightweight analytics tracking utility
 * Sends events to the analytics API endpoint
 */

export type AnalyticsEvent = 
  | "homepage_visit"
  | "reply_game_interaction"
  | "signup_click"
  | "account_created"
  | "reply_generated"
  | "login_clicked"
  | "pricing_view"
  | "upgrade_clicked";

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  userId?: string;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}

/**
 * Track an analytics event
 * Uses sendBeacon for reliability (doesn't wait for response)
 */
export async function trackEvent(
  event: AnalyticsEvent,
  metadata?: Record<string, unknown>,
  userId?: string
): Promise<void> {
  try {
    const payload: AnalyticsPayload = {
      event,
      userId,
      metadata,
      timestamp: Date.now(),
    };

    // Use sendBeacon for page unload reliability
    if (navigator?.sendBeacon) {
      navigator.sendBeacon(
        "/api/analytics",
        JSON.stringify(payload)
      );
    } else {
      // Fallback to fetch
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    }
  } catch (error) {
    // Silently fail - don't break app if analytics fails
    console.debug("Analytics tracking error:", error);
  }
}

/**
 * Track homepage visit
 */
export function trackHomepageVisit(): Promise<void> {
  return trackEvent("homepage_visit");
}

/**
 * Track Reply Game interaction
 */
export function trackReplyGameInteraction(round: number): Promise<void> {
  return trackEvent("reply_game_interaction", { round });
}

/**
 * Track signup CTA click
 */
export function trackSignupClick(source: string): Promise<void> {
  return trackEvent("signup_click", { source });
}

/**
 * Track account creation
 */
export function trackAccountCreated(email: string): Promise<void> {
  return trackEvent("account_created", { email });
}

/**
 * Track reply generation
 */
export function trackReplyGenerated(tone: string, isPro: boolean): Promise<void> {
  return trackEvent("reply_generated", { tone, isPro });
}

/**
 * Track login click
 */
export function trackLoginClick(source: string): Promise<void> {
  return trackEvent("login_clicked", { source });
}

/**
 * Track pricing page view
 */
export function trackPricingView(): Promise<void> {
  return trackEvent("pricing_view");
}

/**
 * Track upgrade click
 */
export function trackUpgradeClick(currentPlan: string): Promise<void> {
  return trackEvent("upgrade_clicked", { currentPlan });
}
