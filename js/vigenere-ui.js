/* Independent editor and non-executing inspector for the ASCII95 variant. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./vigenere-core.js"), require("./learning-core.js"), require("./samples.js"));
  } else root.VigenereUI = factory(root.VigenereCore, root.LearningCore, root.Samples);
})(typeof globalThis !== "undefined" ? globalThis : this, function (core, learning, samples) {
  "use strict";

  function create({ document, t, getLanguage, Runner, writeClipboard, download }) {
    const el = name => document.getElementById("vig-" + name);
    let generated = null;
    let captured = null;
    let inspection = null;
    let revision = 0;
    const runner = new Runner({
      host: el("host"),
      onState: () => buttons(),
      onResult: result => {
        const line = document.createElement("div");
        line.textContent = result.kind === "done" ? t("vigDone") :
          ["unsupportedProtocol", "codeTooLarge", "executionTimeout"].includes(result.text) ? t(result.text) : result.text;
        el("run-result").appendChild(line);
      },
    });

    function buttons() {
      const key = core.parseKey(el("key").value);
      const tooLarge = el("source").value.length > core.LIMIT;
      el("key").setAttribute("aria-invalid", String(!key.ok));
      el("key-note").textContent = !key.ok ? t("vigKeyError") : key.noop ? t("vigNoop") : t("vigKeyRule");
      el("generate").disabled = !key.ok || tooLarge;
      el("limit-note").hidden = !tooLarge;
      for (const name of ["copy", "download", "inspect-load"]) el(name).disabled = !generated;
      el("run").disabled = !generated || !Runner.supported || runner.running;
    }

    function stop() {
      revision++;
      runner.reset();
      el("run-result").replaceChildren();
    }

    function invalidate() {
      generated = null;
      stop();
      el("output").value = "";
      el("trace").replaceChildren();
      el("sizes").textContent = "";
      el("status").textContent = t("vigStale");
      buttons();
    }

    function renderInspection() {
      el("restored").textContent = inspection?.ok ? inspection.source : "";
      const status = el("inspect-status");
      status.dataset.state = !inspection ? "empty" : !inspection.ok ? "invalid" : captured === null ? "accepted" :
        captured === inspection.source ? "equal" : "different";
      status.textContent = !inspection ? "" : !inspection.ok ? t("vigRejected") :
        t("vigRestored") + " " + (captured === null ? t("vigNoReference") :
          t(captured === inspection.source ? "vigEqual" : "vigDifferent"));
    }

    function clearInspection(clearInput = false) {
      if (clearInput) el("inspect-input").value = "";
      captured = null;
      inspection = null;
      renderInspection();
    }

    function cpLabel(code) { return "U+" + code.toString(16).toUpperCase().padStart(4, "0"); }

    function generate() {
      invalidate();
      try {
        const source = el("source").value;
        const key = core.parseKey(el("key").value);
        const snippet = core.buildSnippet(source, el("key").value);
        generated = { source, key: key.value, snippet };
        el("output").value = snippet;
        const inputSize = learning.size(source);
        const outputSize = learning.size(snippet);
        const sizes = size => `${size.codePoints} / ${size.utf16Units} / ${size.utf8Bytes}`;
        el("sizes").textContent = t("vigSizes", { source: sizes(inputSize), output: sizes(outputSize) });
        if (learning.loneSurrogates(source)) el("sizes").textContent += " " + t("vigSurrogate");
        const rows = core.trace(source, key.value).map(row => {
          const li = document.createElement("li");
          const shift = row.keyIndex === null ? t("vigPass") :
            t("vigTraceKey", { index: row.keyIndex + 1, key: key.value[row.keyIndex], shift: row.shift });
          li.textContent = `${row.index + 1}: ${cpLabel(row.input)} → ${cpLabel(row.output)} · ${shift}`;
          return li;
        });
        el("trace").replaceChildren(...rows);
        el("status").textContent = t("vigGenerated");
      } catch (error) {
        generated = null;
        el("status").textContent = t(error.message === "tooLarge" ? "vigTooLarge" : "vigKeyError");
      }
      buttons();
    }

    function refreshLanguage() {
      for (const node of document.querySelectorAll("[data-vig]")) node.textContent = t(node.dataset.vig);
      el("host").setAttribute("aria-label", t("runHost"));
      const selected = el("sample").value || "basic";
      const options = samples.samples.map(sample => {
        const option = document.createElement("option");
        option.value = sample.id;
        option.textContent = samples.get(sample.id, getLanguage()).name;
        return option;
      });
      el("sample").replaceChildren(...options);
      el("sample").value = selected;
      el("protocol-note").hidden = Runner.supported;
      invalidate();
      renderInspection();
    }

    const on = (name, event, handler) => el(name).addEventListener(event, handler);
    on("source", "input", invalidate);
    on("key", "input", invalidate);
    on("generate", "click", generate);
    on("load", "click", () => {
      el("source").value = samples.get(el("sample").value, getLanguage()).source;
      invalidate();
    });
    on("clear", "click", () => { el("source").value = ""; invalidate(); });
    on("reset", "click", () => {
      el("sample").value = "basic";
      el("source").value = samples.get("basic", getLanguage()).source;
      el("key").value = "LEMON";
      invalidate();
    });
    on("copy", "click", async () => {
      if (!generated) return;
      const pending = ++revision;
      try {
        await writeClipboard(generated.snippet);
        if (pending === revision) el("status").textContent = t("vigCopied");
      } catch {
        if (pending !== revision) return;
        el("output").focus();
        el("output").select();
        el("status").textContent = t("vigCopyManual");
      }
    });
    on("download", "click", () => { if (generated) download(generated.snippet); });
    on("run", "click", () => {
      if (!generated || !Runner.supported || runner.running) return;
      stop();
      runner.run(generated.snippet);
    });
    on("stop", "click", stop);
    on("inspect-load", "click", () => {
      if (!generated) return;
      clearInspection();
      el("inspect-input").value = generated.snippet;
      captured = generated.source;
    });
    on("inspect-input", "input", () => clearInspection());
    on("inspect-clear", "click", () => clearInspection(true));
    on("inspect", "click", () => {
      inspection = null;
      renderInspection();
      try { inspection = core.inspectSnippet(el("inspect-input").value); }
      catch { inspection = { ok: false }; }
      renderInspection();
    });
    el("source").value = samples.get("basic", getLanguage()).source;
    refreshLanguage();
    return Object.freeze({ stop, refreshLanguage });
  }

  return Object.freeze({ create });
});
