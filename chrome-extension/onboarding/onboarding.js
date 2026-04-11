// ─── Smart Reply Pro Extension · Onboarding Script ────────────────────────────

(function () {
  var SRP_URL      = "https://www.smartreplypro.ai";
  var LOGIN_URL    = SRP_URL + "/login";
  var REGISTER_URL = SRP_URL + "/register";

  document.getElementById("btn-signin").addEventListener("click", function () {
    // Open the extension popup so the user signs in there, or open the website
    // Try to open the popup — if unavailable fall back to website login
    try {
      // Programmatic popup open is not allowed in MV3; open website instead
      chrome.tabs.create({ url: LOGIN_URL });
    } catch (_) {
      window.open(LOGIN_URL, "_blank");
    }
  });

  document.getElementById("btn-create").addEventListener("click", function () {
    try {
      chrome.tabs.create({ url: REGISTER_URL });
    } catch (_) {
      window.open(REGISTER_URL, "_blank");
    }
  });
})();
