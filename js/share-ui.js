/* Shared settings remain pending until explicitly applied. No code or current URL is serialized. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory(require("./share-settings.js"));
  else root.ShareUI = factory(root.ShareSettings);
})(typeof globalThis !== "undefined" ? globalThis : this, function (core) {
  "use strict";

  function create({ document, t, getSettings, getHash, applySettings, writeClipboard, sampleName }) {
    const node = (id) => document.getElementById(id);
    let pending = null;
    let currentUrl = "";
    let revision = 0;
    let statusKey = "";
    let receiveError = false;

    function render() {
      node("share-url").value = currentUrl;
      node("btn-share-copy").disabled = !currentUrl;
      node("btn-share-create").disabled = !core.create(getSettings()).ok;
      node("share-status").textContent = statusKey ? t(statusKey) : "";
      node("share-pending").hidden = !pending;
      node("share-error").textContent = receiveError ? t("shareInvalid") : "";
      node("share-preview").textContent = pending ? t("sharePreview", {
        sample: sampleName(pending.settings.sampleId), key: pending.settings.shift,
        language: pending.settings.language === "ja" ? t("shareJapanese") : t("shareEnglish"),
        view: t(pending.settings.view === "normal" ? "normal" : "compare"),
      }) : "";
    }

    function invalidate() {
      revision++;
      currentUrl = "";
      statusKey = "";
      render();
    }

    function receiveHash() {
      const hash = getHash();
      const parsed = core.parse(hash);
      pending = parsed.ok && parsed.kind === "settings" ? { hash, settings: parsed.settings } : null;
      receiveError = !parsed.ok;
      render();
      if (pending || receiveError) node("share-panel").open = true;
    }

    node("btn-share-create").addEventListener("click", () => {
      const result = core.create(getSettings());
      revision++;
      currentUrl = result.ok ? result.url : "";
      statusKey = result.ok ? "shareCreated" : "shareKeyError";
      render();
    });
    node("btn-share-copy").addEventListener("click", async () => {
      if (!currentUrl) return;
      const copied = currentUrl;
      const version = revision;
      const stillCurrent = () => revision === version && currentUrl === copied;
      try {
        await writeClipboard(copied);
        if (!stillCurrent()) return;
        statusKey = "shareCopied";
      } catch {
        if (!stillCurrent()) return;
        node("share-url").focus();
        node("share-url").select();
        statusKey = "shareCopyManual";
      }
      render();
    });
    node("btn-share-apply").addEventListener("click", () => {
      if (!pending) return;
      // The fragment can change before the asynchronous hashchange event is dispatched.
      if (pending.hash !== getHash()) { receiveHash(); return; }
      const parsed = core.parse(pending.hash);
      if (!parsed.ok || parsed.kind !== "settings") { pending = null; receiveError = true; render(); return; }
      applySettings(parsed.settings);
      pending = null;
      statusKey = "shareApplied";
      render();
    });
    node("btn-share-dismiss").addEventListener("click", () => { pending = null; render(); });
    receiveHash();
    return Object.freeze({ invalidate, receiveHash, refreshLanguage: render });
  }

  return Object.freeze({ create });
});
