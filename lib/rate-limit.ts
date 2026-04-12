// WARNING: This rate limiter uses in-memory storage.
// State resets on serverless cold starts and is NOT shared across concurrent instances.
// For a high-traffic production deployment, replace `requests` with a Redis-backed
// store such as @upstash/ratelimit to get consistent, durable rate limiting.
const requests = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
  limit?: number;
  reset?: number;
}

/**
 * Enforce rate limiting with configurable limits and time windows.
 * Uses in-memory storage keyed by user ID or IP address.
 * 
 * @param key - Unique identifier (user ID or IP address)
 * @param limit - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60 seconds)
 * @returns RateLimitResult with allowed status and retry info
 */
export function enforceRateLimit(
  key: string,
  limit: number = 20,
  windowMs: number = 60_000
): RateLimitResult {
  const now = Date.now();
  const current = requests.get(key);

  // Reset if window has passed
  if (!current || current.resetAt < now) {
    requests.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: limit - 1,
      limit,
      reset: now + windowMs,
    };
  }

  // Check if limit exceeded
  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((current.resetAt - now) / 1000),
      remaining: 0,
      limit,
      reset: current.resetAt,
    };
  }

  // Increment and allow
  current.count += 1;
  requests.set(key, current);
  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    limit,
    reset: current.resetAt,
  };
}

/**
 * Get tier-based rate limit for a user.
 * Free users: 10 requests/min
 * Pro users: 30 requests/min
 */
export function getTierRateLimit(isPro: boolean) {
  return {
    limit: isPro ? 30 : 10,
    windowMs: 60_000, // 1 minute
  };
}

/**
 * Extract the best-available client IP from a request's headers.
 *
 * On Vercel/Cloudflare the `x-forwarded-for` header is set by the edge network
 * and can be trusted. If you run behind a custom reverse-proxy that does NOT
 * strip this header, an attacker could spoof it — in that case replace this
 * function with one that reads from your trusted proxy header only.
 *
 * @param req - Standard Web API Request object (works with Next.js App Router)
 * @returns IP string, e.g. "1.2.3.4", or "unknown" as fallback
 */
export function extractRequestIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    // x-forwarded-for can be a comma-separated list; leftmost is the originating client
    return xff.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

