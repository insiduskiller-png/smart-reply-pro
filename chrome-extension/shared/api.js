// ─── Smart Reply Pro Extension · API Bridge ───────────────────────────────────
// All fetch calls live here. These are called from the background service worker
// which bypasses CORS restrictions entirely (MV3 service workers are not subject
// to web-origin CORS rules).

import { SRP_API_URL, STORAGE_KEYS } from "./constants.js";

// ─── Auth Error ───────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(message = "Session expired. Please sign in again.") {
    super(message);
    this.name = "AuthError";
    this.type = "AUTH_ERROR";
  }
}

export class NotProError extends Error {
  constructor(upgradeUrl) {
    super("Pro subscription required");
    this.name = "NotProError";
    this.type = "NOT_PRO";
    this.upgradeUrl = upgradeUrl ?? `${SRP_API_URL}/pricing`;
  }
}

// ─── Token helpers ────────────────────────────────────────────────────────────

async function getToken() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.TOKEN);
  return result[STORAGE_KEYS.TOKEN] ?? null;
}

async function getRefreshToken() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.REFRESH_TOKEN);
  return result[STORAGE_KEYS.REFRESH_TOKEN] ?? null;
}

async function tryRefreshToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  try {
    const resp = await fetch(`${SRP_API_URL}/api/extension/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    await chrome.storage.local.set({
      [STORAGE_KEYS.TOKEN]: data.token,
      [STORAGE_KEYS.REFRESH_TOKEN]: data.refreshToken,
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Authenticated fetch (auto-refresh on 401) ────────────────────────────────

async function authFetch(path, options = {}, isRetry = false) {
  const token = await getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const response = await fetch(`${SRP_API_URL}${path}`, {
    ...options,
    headers,
  });

  // Auto-refresh on 401
  if (response.status === 401 && !isRetry) {
    const refreshed = await tryRefreshToken();
    if (refreshed) return authFetch(path, options, true);
    // Clear stale auth state
    await chrome.storage.local.remove([
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.IS_PRO,
    ]);
    throw new AuthError();
  }

  return response;
}

// ─── Public API functions ─────────────────────────────────────────────────────

/**
 * Authenticate with email + password.
 * Returns { token, refreshToken, user, isPro, subscriptionStatus }
 */
export async function login(email, password) {
  const resp = await fetch(`${SRP_API_URL}/api/extension/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error ?? "Login failed");
  }

  return resp.json();
}

/**
 * Fetch the user's saved reply profiles.
 * Returns { profiles: [...] }
 */
export async function fetchProfiles() {
  const resp = await authFetch("/api/extension/profiles");

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    if (resp.status === 403) throw new NotProError(data.upgradeUrl);
    throw new Error(data.error ?? "Failed to fetch profiles");
  }

  return resp.json();
}

/**
 * Generate one best reply using the selected profile.
 * Returns { reply: string }
 */
export async function generateReply({ profileId, input, context, sourceDomain, pageTitle }) {
  const resp = await authFetch("/api/extension/generate", {
    method: "POST",
    body: JSON.stringify({ profileId, input, context, sourceDomain, pageTitle }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    if (resp.status === 403) throw new NotProError(data.upgradeUrl);
    throw new Error(data.error ?? "Generation failed");
  }

  return resp.json();
}
