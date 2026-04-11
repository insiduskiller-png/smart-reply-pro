# Smart Reply Pro — Chrome Extension

Manifest V3 browser companion for Smart Reply Pro. Brings your saved personal Reply Profiles to any website and generates one strategic reply from selected text.

---

## Architecture

```
chrome-extension/
├── manifest.json                  MV3 manifest
├── background/
│   └── service-worker.js          All API calls live here (bypasses CORS)
├── content/
│   └── content.js                 Selection capture + reply insertion
├── popup/
│   ├── popup.html                 Extension popup
│   ├── popup.css                  Dark premium theme
│   └── popup.js                   State machine + UI logic
├── onboarding/
│   ├── onboarding.html            First-install welcome page
│   ├── onboarding.css
│   └── onboarding.js
├── shared/
│   ├── constants.js               URLs, storage keys, message types
│   └── api.js                     Typed fetch wrappers (called from SW)
└── icons/
    ├── generate-icons.mjs         Run once to produce PNG icons
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

### Why all API calls go through the background service worker

MV3 service workers are not web origins — they bypass CORS entirely. Popup pages are web contexts and would require CORS headers for cross-origin requests. Routing all fetches through the service worker eliminates this dependency.

---

## Backend API routes (added to the Next.js app)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/extension/auth` | POST | — | Email/password login, returns JWT |
| `/api/extension/profiles` | GET | Bearer token | Fetch user's reply profiles |
| `/api/extension/generate` | POST | Bearer token | Generate one strategic reply |
| `/api/extension/refresh` | POST | — | Refresh expired JWT |

All routes require a **Pro subscription** for profile/generate operations and return `{ error, upgradeUrl }` with HTTP 403 otherwise.

---

## Setup

### 1. Generate icons

```bash
cd chrome-extension/icons
node generate-icons.mjs
```

This creates `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png` using only Node built-ins. Replace them with professionally designed assets before publishing.

### 2. Production vs local development

**Production** — no changes needed. The extension points to `https://www.smartreplypro.ai` by default.

**Local development** — edit two files:

**`shared/constants.js`** — change the first line:
```js
export const SRP_API_URL = "http://localhost:3000";
```

**`manifest.json`** — update `host_permissions` and `content_security_policy`:
```json
"host_permissions": [
    "https://www.smartreplypro.ai/*",
    "https://smartreplypro.ai/*",
  "http://localhost:3000/*"
],
"content_security_policy": {
    "extension_pages": "default-src 'self'; connect-src 'self' https://www.smartreplypro.ai https://smartreplypro.ai http://localhost:3000; style-src 'self' 'unsafe-inline';"
}
```

### 3. Load the extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `chrome-extension/` folder

---

## Core flow

```
User selects text on any page
    ↓
content.js captures: text + surrounding context + domain
    ↓
User opens popup → popup.js checks auth via background SW
    ↓
Popup shows profile selector + selection preview
    ↓
User clicks Generate → popup sends MSG.GENERATE to background SW
    ↓
background/service-worker.js calls POST /api/extension/generate
    ↓
API validates Bearer token, checks Pro, loads profile, calls generateReply()
    ↓
Single best reply returned → displayed in popup
    ↓
User copies or inserts into active text field
```

---

## Pro gating

- Extension is installable by anyone
- On sign-in: `isPro` flag returned from `/api/extension/auth`
- If `false`: popup shows "Pro Required" screen with link to `/pricing`
- Once the user upgrades on the website, next sign-in unlocks the extension automatically
- No separate Chrome Web Store purchase

---

## Permissions explained (shown in onboarding)

| Permission | Why |
|---|---|
| `storage` | Cache auth token and profiles locally on-device |
| `activeTab` | Read selected text from the current tab when user clicks Generate |
| `scripting` | Inject reply text into supported text fields |
| Host: `www.smartreplypro.ai` / `smartreplypro.ai` | Communicate with the Smart Reply Pro API |

---

## Security notes

- Auth token stored in `chrome.storage.local` (not `sessionStorage` or `localStorage`)
- Token is a Supabase JWT — scoped to the authenticated user only
- Content script is sandboxed; it can only read selections and write to focused inputs
- The service worker validates the token on every generate call server-side
- Tokens are auto-refreshed silently; expired sessions prompt re-login

---

## Publishing to Chrome Web Store

Before submitting:

1. Replace placeholder icons with final branded assets (1024×1024 store icon also required)
2. Write a 132-character store description
3. Take 1280×800 or 640×400 screenshots
4. Set `"version"` in `manifest.json` to your release version
5. Remove localhost entries from `host_permissions` and CSP
6. Zip only the `chrome-extension/` folder contents (not the folder itself)
