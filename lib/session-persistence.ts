"use client";

export type SessionPersistenceMode = "temporary" | "persistent";

export const TEMPORARY_SESSION_RESTORE_WINDOW_MS = 10 * 60 * 1000;

const SESSION_MODE_KEY = "srp.session.persistence_mode";
const LAST_ACTIVE_AT_KEY = "srp.session.last_active_at";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function getStoredSessionMode(): SessionPersistenceMode | null {
  if (!canUseStorage()) {
    return null;
  }

  const value = window.localStorage.getItem(SESSION_MODE_KEY);
  return value === "temporary" || value === "persistent" ? value : null;
}

export function setStoredSessionMode(mode: SessionPersistenceMode) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(SESSION_MODE_KEY, mode);

  if (mode === "temporary") {
    touchTemporarySessionActivity();
    return;
  }

  window.localStorage.removeItem(LAST_ACTIVE_AT_KEY);
}

export function getLastActiveAt(): number | null {
  if (!canUseStorage()) {
    return null;
  }

  const value = window.localStorage.getItem(LAST_ACTIVE_AT_KEY);
  if (!value) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function touchTemporarySessionActivity(timestamp = Date.now()) {
  if (!canUseStorage() || getStoredSessionMode() !== "temporary") {
    return;
  }

  window.localStorage.setItem(LAST_ACTIVE_AT_KEY, String(timestamp));
}

export function isTemporarySessionExpired(now = Date.now()) {
  if (getStoredSessionMode() !== "temporary") {
    return false;
  }

  const lastActiveAt = getLastActiveAt();
  if (!lastActiveAt) {
    return true;
  }

  return now - lastActiveAt > TEMPORARY_SESSION_RESTORE_WINDOW_MS;
}

export function clearSessionPersistenceState() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(SESSION_MODE_KEY);
  window.localStorage.removeItem(LAST_ACTIVE_AT_KEY);
}