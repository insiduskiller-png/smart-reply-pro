// ─── Smart Reply Pro Extension · Background Service Worker ───────────────────
// All API calls are made here. MV3 service workers bypass CORS restrictions,
// so we proxy every fetch through this script instead of calling from popup.js.

import {
  login,
  fetchProfiles,
  generateReply,
  AuthError,
  NotProError,
} from "../shared/api.js";

import {
  STORAGE_KEYS,
  MSG,
  PRICING_URL,
  DASHBOARD_URL,
  REGISTER_URL,
} from "../shared/constants.js";

// ─── Install: open onboarding on first install ────────────────────────────────

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("onboarding/onboarding.html"),
    });
  }
});

// ─── Message router ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((err) => {
      if (err instanceof AuthError) {
        sendResponse({ error: err.message, type: "AUTH_ERROR" });
      } else if (err instanceof NotProError) {
        sendResponse({
          error: err.message,
          type: "NOT_PRO",
          upgradeUrl: err.upgradeUrl,
        });
      } else {
        sendResponse({ error: err?.message ?? "Unexpected error" });
      }
    });
  return true; // keep channel open for async response
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleMessage(message) {
  switch (message.type) {
    // ── Auth state ──────────────────────────────────────────────────────────
    case MSG.GET_AUTH_STATE: {
      const stored = await chrome.storage.local.get([
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.USER,
        STORAGE_KEYS.IS_PRO,
      ]);
      return {
        isAuthenticated: Boolean(stored[STORAGE_KEYS.TOKEN]),
        user: stored[STORAGE_KEYS.USER] ?? null,
        isPro: stored[STORAGE_KEYS.IS_PRO] ?? false,
      };
    }

    // ── Login ────────────────────────────────────────────────────────────────
    case MSG.LOGIN: {
      const { email, password } = message;
      const data = await login(email, password);

      await chrome.storage.local.set({
        [STORAGE_KEYS.TOKEN]: data.token,
        [STORAGE_KEYS.REFRESH_TOKEN]: data.refreshToken,
        [STORAGE_KEYS.USER]: data.user,
        [STORAGE_KEYS.IS_PRO]: data.isPro,
      });

      // Eagerly cache profiles so the popup loads fast
      if (data.isPro) {
        try {
          const { profiles } = await fetchProfiles();
          await chrome.storage.local.set({ [STORAGE_KEYS.PROFILES]: profiles });
        } catch (_) {
          // Non-fatal: profiles will load on demand
        }
      }

      return { success: true, user: data.user, isPro: data.isPro };
    }

    // ── Logout ───────────────────────────────────────────────────────────────
    case MSG.LOGOUT: {
      await chrome.storage.local.remove([
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
        STORAGE_KEYS.IS_PRO,
        STORAGE_KEYS.PROFILES,
        STORAGE_KEYS.SELECTED_PROFILE_ID,
      ]);
      return { success: true };
    }

    // ── Get profiles (cache-first, then network) ──────────────────────────────
    case MSG.GET_PROFILES: {
      const cached = await chrome.storage.local.get(STORAGE_KEYS.PROFILES);
      if (cached[STORAGE_KEYS.PROFILES]?.length) {
        return { profiles: cached[STORAGE_KEYS.PROFILES] };
      }
      const { profiles } = await fetchProfiles();
      await chrome.storage.local.set({ [STORAGE_KEYS.PROFILES]: profiles });
      return { profiles };
    }

    // ── Force-refresh profiles from network ───────────────────────────────────
    case MSG.REFRESH_PROFILES: {
      const { profiles } = await fetchProfiles();
      await chrome.storage.local.set({ [STORAGE_KEYS.PROFILES]: profiles });
      return { profiles };
    }

    // ── Generate reply ────────────────────────────────────────────────────────
    case MSG.GENERATE: {
      const { profileId, input, context, sourceDomain, pageTitle } = message;
      const result = await generateReply({ profileId, input, context, sourceDomain, pageTitle });
      return { reply: result.reply };
    }

    // ── Persist selected profile ──────────────────────────────────────────────
    case MSG.SET_SELECTED_PROFILE: {
      await chrome.storage.local.set({
        [STORAGE_KEYS.SELECTED_PROFILE_ID]: message.profileId,
      });
      return { success: true };
    }

    // ── Open external URL ─────────────────────────────────────────────────────
    case MSG.OPEN_URL: {
      const allowed = [PRICING_URL, DASHBOARD_URL, REGISTER_URL];
      const url = message.url ?? DASHBOARD_URL;
      // Only allow SRP URLs
      if (!allowed.some((u) => url.startsWith(u.replace(/\/$/, "")))) {
        throw new Error("URL not allowed");
      }
      await chrome.tabs.create({ url });
      return { success: true };
    }

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}
