// ─── Smart Reply Pro Extension · Shared Constants ────────────────────────────
// Change SRP_API_URL for local development:
//   export const SRP_API_URL = "http://localhost:3000";

export const SRP_API_URL = "https://www.smartreplypro.ai";

export const PRICING_URL = `${SRP_API_URL}/pricing`;
export const DASHBOARD_URL = `${SRP_API_URL}/dashboard`;
export const REGISTER_URL = `${SRP_API_URL}/register`;

// chrome.storage.local keys
export const STORAGE_KEYS = Object.freeze({
  TOKEN: "srp_token",
  REFRESH_TOKEN: "srp_refresh_token",
  USER: "srp_user",
  IS_PRO: "srp_is_pro",
  PROFILES: "srp_profiles",
  SELECTED_PROFILE_ID: "srp_selected_profile_id",
  ONBOARDED: "srp_onboarded",
});

// Message types between popup ↔ background ↔ content
export const MSG = Object.freeze({
  GET_AUTH_STATE: "GET_AUTH_STATE",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  GET_PROFILES: "GET_PROFILES",
  REFRESH_PROFILES: "REFRESH_PROFILES",
  GENERATE: "GENERATE",
  SET_SELECTED_PROFILE: "SET_SELECTED_PROFILE",
  OPEN_URL: "OPEN_URL",
  // Content script messages
  GET_SELECTION: "GET_SELECTION",
  INSERT_REPLY: "INSERT_REPLY",
});

export const CATEGORY_COLORS = Object.freeze({
  Dating: "#ec4899",
  Work: "#3b82f6",
  Client: "#6366f1",
  Family: "#f59e0b",
  Friend: "#10b981",
  Conflict: "#ef4444",
  Other: "#94a3b8",
});
