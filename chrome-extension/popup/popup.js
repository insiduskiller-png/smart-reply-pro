// ─── Smart Reply Pro Extension · Popup Logic ─────────────────────────────────
import { MSG, STORAGE_KEYS, PRICING_URL, DASHBOARD_URL, REGISTER_URL, CATEGORY_COLORS } from "../shared/constants.js";

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  user: null,
  isPro: false,
  profiles: [],
  selectedProfileId: null,
  selection: null,       // { text, context, domain, title } from content script
  reply: null,
  isGenerating: false,
  lastFailure: "",
};

// ─── Cached DOM refs ──────────────────────────────────────────────────────────

const el = {};

function cacheElements() {
  [
    "state-loading", "state-auth", "state-not-pro", "state-failure",
    "state-no-profiles", "state-main",
    "login-form", "email", "password", "login-btn", "login-error",
    "btn-register",
    "btn-upgrade", "btn-logout-upgrade",
    "failure-message", "btn-failure-retry", "btn-failure-signout",
    "btn-go-dashboard", "btn-logout-no-profiles",
    "user-email", "btn-logout",
    "profile-select", "btn-refresh-profiles", "profile-meta", "profile-identity",
    "selection-box", "selection-placeholder", "selection-meta", "btn-refresh-selection", "no-selection-state",
    "btn-generate",
    "reply-section", "reply-box", "btn-regenerate",
    "btn-copy", "btn-insert", "btn-open-srp",
    "generating-overlay",
  ].forEach((id) => {
    el[id] = document.getElementById(id);
  });
}

// ─── State display helper ─────────────────────────────────────────────────────

function showState(name) {
  document.querySelectorAll(".state").forEach((node) => {
    node.classList.toggle("active", node.id === `state-${name}`);
  });
}

// ─── Message helper ───────────────────────────────────────────────────────────

function sendMsg(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (response?.type === "AUTH_ERROR") return reject({ authError: true, message: response.error });
      if (response?.type === "NOT_PRO")    return reject({ notPro: true, upgradeUrl: response.upgradeUrl });
      if (response?.error && !response?.profiles && !response?.reply && !response?.success) {
        return reject(new Error(response.error));
      }
      resolve(response);
    });
  });
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function truncateText(text, maxLen = 120) {
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen).trimEnd() + "…" : text;
}

function describeProfile(profile) {
  const summary = String(profile?.profile_summary ?? "").trim();
  const styleMemory = String(profile?.style_memory ?? "").trim();
  const notes = String(profile?.context_notes ?? "").trim();
  return truncateText(summary || styleMemory || notes || "Profile learned from your imported chat history.", 180);
}

function openUrl(url) {
  sendMsg({ type: MSG.OPEN_URL, url }).catch(() => {
    chrome.tabs.create({ url });
  });
}

function showFailure(message) {
  state.lastFailure = message || "We couldn't refresh your session or profile data. Try again.";
  el["failure-message"].textContent = state.lastFailure;
  showState("failure");
}

// ─── Profile selector ─────────────────────────────────────────────────────────

function populateProfileSelector(profiles) {
  const select = el["profile-select"];
  // Clear existing options except the placeholder
  while (select.options.length > 1) select.remove(1);

  profiles.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.profile_name}${p.category ? ` · ${p.category}` : ""}`;
    select.appendChild(opt);
  });
}

function syncProfileMeta() {
  const meta = el["profile-meta"];
  const identity = el["profile-identity"];
  const profile = state.profiles.find((p) => p.id === state.selectedProfileId);
  if (!profile) {
    meta.textContent = "";
    identity.textContent = "";
    return;
  }

  const color = CATEGORY_COLORS[profile.category] ?? CATEGORY_COLORS["Other"];
  meta.innerHTML = `
    <span class="category-dot" style="background:${color}"></span>
    <span>${profile.category ?? "Other"}</span>
    ${profile.interaction_count ? `<span style="color:var(--text-muted)">· ${profile.interaction_count} learned replies</span>` : ""}
  `;

  identity.textContent = describeProfile(profile);
}

function syncGenerateButton() {
  const hasProfile   = Boolean(state.selectedProfileId);
  const hasSelection = Boolean(state.selection?.text?.trim());
  el["btn-generate"].disabled = !(hasProfile && hasSelection) || state.isGenerating;
}

// ─── Selection display ────────────────────────────────────────────────────────

function renderSelection() {
  const box   = el["selection-box"];
  const ph    = el["selection-placeholder"];
  const meta  = el["selection-meta"];
  const text  = state.selection?.text?.trim() ?? "";

  if (text) {
    box.textContent = truncateText(text, 200);
    if (ph) ph.style.display = "none";
    const domain = state.selection?.domain ? `on ${state.selection.domain}` : "";
    const title = state.selection?.title ? ` · ${truncateText(state.selection.title, 45)}` : "";
    meta.textContent = `Using selected text ${domain}${title}`.trim();
    el["no-selection-state"].classList.add("hidden");
  } else {
    box.textContent = "";
    if (ph) ph.style.display = "";
    meta.textContent = "No text selected yet.";
    el["no-selection-state"].classList.remove("hidden");
  }
  syncGenerateButton();
}

// ─── Get selected text from active tab ───────────────────────────────────────

async function refreshSelection() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const result = await chrome.tabs.sendMessage(tab.id, { type: MSG.GET_SELECTION });
    state.selection = result?.text?.trim() ? result : null;
    renderSelection();
  } catch (_) {
    state.selection = null;
    renderSelection();
  }
}

// ─── Generate flow ────────────────────────────────────────────────────────────

async function runGenerate() {
  if (state.isGenerating) return;

  const profileId   = state.selectedProfileId;
  const input       = state.selection?.text?.trim();
  const context     = state.selection?.context ?? "";
  const sourceDomain = state.selection?.domain ?? "";
  const pageTitle = state.selection?.title ?? "";

  if (!profileId || !input) return;

  state.isGenerating = true;
  state.reply = null;

  el["generating-overlay"].classList.remove("hidden");
  el["reply-section"].classList.add("hidden");
  el["btn-generate"].disabled = true;

  try {
    const result = await sendMsg({
      type: MSG.GENERATE,
      profileId,
      input,
      context,
      sourceDomain,
      pageTitle,
    });
    state.reply = result.reply;
    renderReply();
  } catch (err) {
    if (err?.notPro) {
      showState("not-pro");
    } else if (err?.authError) {
      showState("auth");
    } else if (String(err?.message ?? "").toLowerCase().includes("session")) {
      showFailure(err?.message ?? "Session issue. Please retry.");
    } else {
      // Show error inline
      el["reply-box"].textContent = err?.message ?? "Generation failed. Please try again.";
      el["reply-section"].classList.remove("hidden");
    }
  } finally {
    state.isGenerating = false;
    el["generating-overlay"].classList.add("hidden");
    syncGenerateButton();
  }
}

function renderReply() {
  if (!state.reply) return;
  el["reply-box"].textContent = state.reply;
  el["reply-section"].classList.remove("hidden");
  el["btn-copy"].textContent = "";
  el["btn-copy"].innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
    Copy
  `;
  el["btn-copy"].classList.remove("btn-copy-success");
}

// ─── Copy handler ─────────────────────────────────────────────────────────────

async function copyReply() {
  if (!state.reply) return;
  try {
    await navigator.clipboard.writeText(state.reply);
    el["btn-copy"].innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Copied
    `;
    el["btn-copy"].classList.add("btn-copy-success");
    setTimeout(() => {
      renderReply();
    }, 2000);
  } catch (_) {
    // Clipboard API failed — fallback via content script
  }
}

// ─── Insert handler ───────────────────────────────────────────────────────────

async function insertReply() {
  if (!state.reply) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const result = await chrome.tabs.sendMessage(tab.id, {
      type: MSG.INSERT_REPLY,
      text: state.reply,
    });
    if (result?.success) {
      el["btn-insert"].textContent = "✓ Inserted";
      setTimeout(() => { el["btn-insert"].textContent = "Insert"; }, 2000);
    } else {
      el["btn-insert"].textContent = "No active field";
      setTimeout(() => { el["btn-insert"].textContent = "Insert"; }, 2000);
    }
  } catch (_) {
    el["btn-insert"].textContent = "Not available";
    setTimeout(() => { el["btn-insert"].textContent = "Insert"; }, 2000);
  }
}

// ─── Main init ────────────────────────────────────────────────────────────────

async function init() {
  cacheElements();
  showState("loading");

  // 1. Check auth
  let authState;
  try {
    authState = await sendMsg({ type: MSG.GET_AUTH_STATE });
  } catch (err) {
    showFailure(err?.message ?? "Could not validate your session.");
    bindFailureEvents();
    return;
  }

  if (!authState.isAuthenticated) {
    showState("auth");
    bindAuthEvents();
    return;
  }

  if (!authState.isPro) {
    state.user = authState.user;
    showState("not-pro");
    bindUpgradeEvents();
    return;
  }

  // 2. Load profiles
  let profiles = [];
  try {
    const result = await sendMsg({ type: MSG.GET_PROFILES });
    profiles = result.profiles ?? [];
  } catch (err) {
    if (err?.authError) { showState("auth"); bindAuthEvents(); return; }
    if (err?.notPro)    { showState("not-pro"); bindUpgradeEvents(); return; }
    showFailure(err?.message ?? "Could not load your profiles.");
    bindFailureEvents();
    return;
  }

  if (!profiles.length) {
    showState("no-profiles");
    bindNoProfilesEvents();
    return;
  }

  // 3. Restore selected profile
  const stored = await chrome.storage.local.get(STORAGE_KEYS.SELECTED_PROFILE_ID);
  const storedId = stored[STORAGE_KEYS.SELECTED_PROFILE_ID];

  state.user     = authState.user;
  state.isPro    = true;
  state.profiles = profiles;
  state.selectedProfileId = storedId && profiles.find((p) => p.id === storedId)
    ? storedId
    : (profiles[0]?.id ?? null);

  renderMainState();

  // 4. Get text selection from the active tab
  await refreshSelection();

  showState("main");
  bindMainEvents();
}

function renderMainState() {
  // User bar
  el["user-email"].textContent = state.user?.email ?? "";

  // Profile selector
  populateProfileSelector(state.profiles);
  el["profile-select"].value = state.selectedProfileId ?? "";
  syncProfileMeta();
  renderSelection();
  syncGenerateButton();
}

// ─── Event binders ─────────────────────────────────────────────────────────────

function bindAuthEvents() {
  if (el["login-form"].dataset.bound === "1") return;
  el["login-form"].dataset.bound = "1";

  el["login-form"].addEventListener("submit", async (e) => {
    e.preventDefault();
    const email    = el["email"].value.trim();
    const password = el["password"].value;

    el["login-error"].textContent = "";
    el["login-error"].classList.add("hidden");
    el["login-btn"].disabled = true;
    el["login-btn"].textContent = "Signing in…";

    try {
      const result = await sendMsg({ type: MSG.LOGIN, email, password });

      if (!result.isPro) {
        state.user = result.user;
        showState("not-pro");
        bindUpgradeEvents();
        return;
      }

      // Re-init from scratch
      await init();
    } catch (err) {
      el["login-error"].textContent = err?.message ?? "Login failed.";
      el["login-error"].classList.remove("hidden");
    } finally {
      el["login-btn"].disabled = false;
      el["login-btn"].textContent = "Sign In";
    }
  });

  el["btn-register"].addEventListener("click", () => openUrl(REGISTER_URL));
}

function bindUpgradeEvents() {
  if (el["btn-upgrade"].dataset.bound === "1") return;
  el["btn-upgrade"].dataset.bound = "1";

  el["btn-upgrade"].addEventListener("click", () => openUrl(PRICING_URL));
  el["btn-logout-upgrade"].addEventListener("click", async () => {
    await sendMsg({ type: MSG.LOGOUT });
    showState("auth");
    bindAuthEvents();
  });
}

function bindNoProfilesEvents() {
  if (el["btn-go-dashboard"].dataset.bound === "1") return;
  el["btn-go-dashboard"].dataset.bound = "1";

  el["btn-go-dashboard"].addEventListener("click", () => openUrl(DASHBOARD_URL));
  el["btn-logout-no-profiles"].addEventListener("click", async () => {
    await sendMsg({ type: MSG.LOGOUT });
    showState("auth");
    bindAuthEvents();
  });
}

function bindFailureEvents() {
  if (el["btn-failure-retry"].dataset.bound === "1") return;
  el["btn-failure-retry"].dataset.bound = "1";

  el["btn-failure-retry"].addEventListener("click", () => init());
  el["btn-failure-signout"].addEventListener("click", async () => {
    await sendMsg({ type: MSG.LOGOUT }).catch(() => {});
    showState("auth");
    bindAuthEvents();
  });
}

function bindMainEvents() {
  if (el["btn-logout"].dataset.bound === "1") return;
  el["btn-logout"].dataset.bound = "1";

  // Logout
  el["btn-logout"].addEventListener("click", async () => {
    await sendMsg({ type: MSG.LOGOUT });
    showState("auth");
    bindAuthEvents();
  });

  // Profile change
  el["profile-select"].addEventListener("change", () => {
    state.selectedProfileId = el["profile-select"].value || null;
    sendMsg({ type: MSG.SET_SELECTED_PROFILE, profileId: state.selectedProfileId }).catch(() => {});
    syncProfileMeta();
    // Clear previous reply on profile switch
    state.reply = null;
    el["reply-section"].classList.add("hidden");
    syncGenerateButton();
  });

  // Refresh profiles
  el["btn-refresh-profiles"].addEventListener("click", async () => {
    el["btn-refresh-profiles"].style.opacity = "0.4";
    try {
      const result = await sendMsg({ type: MSG.REFRESH_PROFILES });
      state.profiles = result.profiles ?? state.profiles;
      populateProfileSelector(state.profiles);
      // Restore selection if still valid
      if (state.profiles.find((p) => p.id === state.selectedProfileId)) {
        el["profile-select"].value = state.selectedProfileId;
      } else {
        state.selectedProfileId = state.profiles[0]?.id ?? null;
        el["profile-select"].value = state.selectedProfileId ?? "";
      }
      syncProfileMeta();
      syncGenerateButton();
    } catch (err) {
      if (err?.authError) {
        showState("auth");
        bindAuthEvents();
        return;
      }
      showFailure(err?.message ?? "Could not refresh profiles.");
      bindFailureEvents();
      return;
    }
    el["btn-refresh-profiles"].style.opacity = "";
  });

  el["btn-refresh-selection"].addEventListener("click", refreshSelection);

  // Generate
  el["btn-generate"].addEventListener("click", runGenerate);

  // Regenerate
  el["btn-regenerate"].addEventListener("click", runGenerate);

  // Copy
  el["btn-copy"].addEventListener("click", copyReply);

  // Insert
  el["btn-insert"].addEventListener("click", insertReply);

  // Open in SRP
  el["btn-open-srp"].addEventListener("click", () => openUrl(DASHBOARD_URL));
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", init);
