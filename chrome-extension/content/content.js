// ─── Smart Reply Pro Extension · Content Script ───────────────────────────────
// Runs on every page. Responsibilities:
//   1. Track the user's text selection and surrounding context
//   2. Respond to popup's GET_SELECTION request
//   3. Insert generated reply into the active text field on INSERT_REPLY

(function () {
  "use strict";

  // ── Message type constants (duplicated from shared/constants.js because
  //    regular content scripts cannot use ES module imports) ────────────────────
  const GET_SELECTION  = "GET_SELECTION";
  const INSERT_REPLY   = "INSERT_REPLY";

  // ── Selection state ──────────────────────────────────────────────────────────
  let lastSelection = { text: "", context: "", domain: "", title: "" };

  // ── Capture selection text + surrounding context ──────────────────────────────

  function getVisibleContext(anchorNode, selectedText) {
    if (!anchorNode) return "";

    // Walk up to find a meaningful parent block
    let node = anchorNode;
    for (let i = 0; i < 6; i++) {
      if (!node?.parentElement) break;
      node = node.parentElement;
      const tag = node.tagName?.toLowerCase();
      if (
        tag === "article" || tag === "main" || tag === "section" ||
        tag === "div"     || tag === "li"   || tag === "p"
      ) break;
    }

    const raw = (node?.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!raw) return "";

    // Remove exact selected text to avoid duplication and keep context minimal
    const withoutSelection = selectedText ? raw.replace(selectedText, " ") : raw;
    const compact = withoutSelection.replace(/\s+/g, " ").trim();

    // Keep a small context window only
    return compact.slice(0, 220);
  }

  function captureSelection() {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";

    if (!text) {
      lastSelection = { text: "", context: "", domain: "", title: "" };
      return;
    }

    const context = getVisibleContext(sel.anchorNode, text);
    const domain  = window.location.hostname.replace(/^www\./, "");
    const title = String(document.title ?? "").slice(0, 120);

    // Hard caps for privacy / minimization
    lastSelection = {
      text: text.slice(0, 900),
      context,
      domain,
      title,
    };
  }

  // ── Listen for selection changes ──────────────────────────────────────────────

  document.addEventListener("mouseup",   captureSelection, { passive: true });
  document.addEventListener("keyup",     captureSelection, { passive: true });
  document.addEventListener("selectionchange", captureSelection, { passive: true });

  // ── Message listener (from popup via chrome.tabs.sendMessage) ─────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {

      // Popup asking for the current selection
      case GET_SELECTION: {
        captureSelection();
        sendResponse({ ...lastSelection });
        return false; // synchronous
      }

      // Popup asking us to insert a reply into the focused element
      case INSERT_REPLY: {
        const text = message.text;
        if (!text) { sendResponse({ error: "No text provided" }); return false; }

        const active = document.activeElement;

        // ── Case 1: standard <input> or <textarea> ─────────────────────────────
        if (
          active instanceof HTMLTextAreaElement ||
          (active instanceof HTMLInputElement && active.type !== "submit" && active.type !== "button")
        ) {
          const start = active.selectionStart ?? active.value.length;
          const end   = active.selectionEnd   ?? active.value.length;
          const before = active.value.slice(0, start);
          const after  = active.value.slice(end);

          // Prefer native input event so React/Vue/Angular stay in sync
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype, "value"
          )?.set ?? Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, "value"
          )?.set;

          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(active, before + text + after);
          } else {
            active.value = before + text + after;
          }

          active.selectionStart = active.selectionEnd = start + text.length;
          active.dispatchEvent(new Event("input",  { bubbles: true }));
          active.dispatchEvent(new Event("change", { bubbles: true }));
          sendResponse({ success: true });
          return false;
        }

        // ── Case 2: contenteditable element ────────────────────────────────────
        const editable =
          active?.isContentEditable ? active : active?.closest("[contenteditable='true']");

        if (editable) {
          editable.focus();
          // Try execCommand first (widely supported in contenteditable)
          const inserted = document.execCommand("insertText", false, text);
          if (!inserted) {
            // Fallback: direct text node insertion at selection
            const selection = window.getSelection();
            if (selection?.rangeCount) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              range.insertNode(document.createTextNode(text));
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
          editable.dispatchEvent(new Event("input", { bubbles: true }));
          sendResponse({ success: true });
          return false;
        }

        // ── Case 3: no suitable target ─────────────────────────────────────────
        sendResponse({ error: "No active text field. Click into a text box first." });
        return false;
      }

      default:
        return false;
    }
  });
})();
