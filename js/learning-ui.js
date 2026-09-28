/* Learning display only: source code is data and is never evaluated here. */
(function (root, factory) {
  "use strict";

  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./learning-core.js"));
  } else {
    root.LearningUI = factory(root.LearningCore);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (core) {
  "use strict";

  function create({ document, t, getCurrentOutput = () => null }) {
    const ids = [
      "lab-status", "trace-count", "trace-rows", "size-rows", "size-equations", "size-wrapper",
      "size-ratios", "size-ratio-empty", "size-lone-warning", "frequency-count", "frequency-rows",
      "frequency-other", "frequency-passed", "frequency-entropy", "frequency-invariant",
    ];
    const nodes = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
    const inspectIds = [
      "inspect-input", "inspect-source", "inspect-status", "inspect-key", "inspect-length", "inspect-comparison",
      "inspect-error", "inspect-lone-warning", "btn-inspect-load", "btn-inspect", "btn-inspect-clear",
    ];
    const inspector = Object.fromEntries(inspectIds.map((id) => [id, document.getElementById(id)]));
    const errorKeys = {
      notString: "inspectErrorNotString", emptyInput: "inspectErrorEmptyInput", tooLarge: "inspectErrorTooLarge",
      bareCarriageReturn: "inspectErrorBareCarriageReturn", mixedLineEndings: "inspectErrorMixedLineEndings",
      lineCount: "inspectErrorLineCount", envelopeMismatch: "inspectErrorEnvelopeMismatch", invalidShift: "inspectErrorInvalidShift",
      payloadEnvelope: "inspectErrorPayloadEnvelope", rawLiteralCharacter: "inspectErrorRawLiteralCharacter",
      invalidEscape: "inspectErrorInvalidEscape", noncanonicalEscape: "inspectErrorNoncanonicalEscape",
      noncanonicalSnippet: "inspectErrorNoncanonicalSnippet",
    };
    // The inspection input and its original-source snapshot are independent of the main editor.
    let originalSource = null;
    let inspectionResult = null;
    let inspectionPhase = "empty";
    let inspectionReason = "";
    const numericAttributes = {
      "trace-count": ["data-total", "data-shown"],
      "frequency-count": ["data-total", "data-unique", "data-shown"],
      "frequency-other": ["data-count"],
      "frequency-passed": ["data-count", "data-rate"],
      "frequency-entropy": ["data-source", "data-payload"],
      "size-lone-warning": ["data-count"],
    };

    function element(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }

    function attributes(node, values) {
      for (const [name, value] of Object.entries(values)) node.setAttribute(name, String(value));
    }

    function pair(parent, label, value, field, extra = {}, code = false) {
      const group = element("div", "lab-pair");
      group.appendChild(element("dt", "", label));
      const content = element("dd", code ? "lab-code-cell" : "", value);
      attributes(content, { "data-field": field, ...extra });
      group.appendChild(content);
      parent.appendChild(group);
      return content;
    }

    function row(parent, className, title) {
      const container = element("div", "lab-row " + className);
      if (title !== undefined) container.appendChild(element("p", "lab-row-title", title));
      const fields = element("dl", "lab-fields");
      container.appendChild(fields);
      parent.appendChild(container);
      return { container, fields };
    }

    function codePoint(character) {
      return "U+" + character.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
    }

    function characterKind(character) {
      const value = character.codePointAt(0);
      if (value >= 0xD800 && value <= 0xDFFF) return "charSurrogate";
      if (value === 32) return "charSpace";
      if (value < 32 || (value >= 127 && value <= 159)) return "charControl";
      if (/[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/u.test(character)) return "charBidi";
      if (/\s/u.test(character)) return "charWhitespace";
      if (/\p{M}/u.test(character)) return "charCombining";
      if (/\p{Cf}|\p{Default_Ignorable_Code_Point}/u.test(character)) return "charFormat";
      return null;
    }

    function characterLabel(character) {
      const kind = characterKind(character);
      return (kind ? t(kind) : character) + " · " + codePoint(character);
    }

    function literalLabel(text) {
      return [...text].map((character) => {
        const kind = characterKind(character);
        return kind ? "[" + t(kind) + " " + codePoint(character) + "]" : character;
      }).join("");
    }

    function percent(value, digits) {
      return value === null ? "—" : value.toFixed(digits) + "%";
    }

    function clear() {
      for (const id of ids) {
        if (id !== "lab-status") nodes[id].replaceChildren();
      }
      for (const [id, names] of Object.entries(numericAttributes)) {
        for (const name of names) nodes[id].setAttribute(name, "");
      }
      nodes["size-ratio-empty"].hidden = true;
      nodes["size-lone-warning"].hidden = true;
      nodes["trace-rows"].setAttribute("tabindex", "-1");
      nodes["frequency-rows"].setAttribute("tabindex", "-1");
      nodes["lab-status"].textContent = t("labEmpty");
      nodes["lab-status"].setAttribute("data-state", "empty");
      inspector["btn-inspect-load"].disabled = true;
    }

    function renderTrace(trace, shift) {
      nodes["trace-count"].textContent = trace.total ? t("traceCount", { shown: trace.shown, total: trace.total }) : t("traceEmpty");
      attributes(nodes["trace-count"], { "data-total": trace.total, "data-shown": trace.shown });
      nodes["trace-rows"].setAttribute("tabindex", trace.shown ? "0" : "-1");
      for (const entry of trace.rows) {
        const item = row(nodes["trace-rows"], "trace-row", t("tracePosition", { index: entry.index + 1 }));
        item.container.setAttribute("data-index", String(entry.index));
        pair(item.fields, t("traceSourceLabel"), characterLabel(entry.source), "source",
          { "data-code-point": entry.sourceCodePoint, "data-source-derived": true }, true);
        pair(item.fields, t("tracePayloadLabel"), characterLabel(entry.payload), "payload",
          { "data-code-point": entry.payloadCodePoint, "data-source-derived": true }, true);
        pair(item.fields, t("traceTargetLabel"), t(entry.shifted ? "traceShifted" : "tracePassed"), "shifted",
          { "data-value": entry.shifted });
        pair(item.fields, t("traceLiteralLabel"), literalLabel(entry.literalBody), "literalBody",
          { "data-source-derived": true }, true);
        if (entry.shifted) {
          const formula = element("p", "lab-formula", t("traceFormula", {
            code: entry.sourceCodePoint, shift, result: entry.payloadCodePoint,
          }));
          formula.setAttribute("data-field", "formula");
          item.container.appendChild(formula);
        }
      }
    }

    function renderSizes(metrics) {
      const units = [["codePoints", "sizeCodePoints"], ["utf16Units", "sizeUtf16"], ["utf8Bytes", "sizeUtf8"]];
      const asciiSize = (count) => ({ codePoints: count, utf16Units: count, utf8Bytes: count });
      const measured = [
        ["source", "sizeSource", metrics.source], ["payload", "sizePayload", metrics.payload],
        ["literalBody", "sizeLiteral", metrics.literalBody], ["escapeExpansion", "sizeEscape", metrics.escapeExpansion],
        ["decoder", "sizeDecoder", metrics.decoder], ["fixedSyntax", "sizeSyntax", asciiSize(metrics.fixedSyntax)],
        ["keyDigits", "sizeKeyDigits", asciiSize(metrics.keyDigits)], ["wrapper", "sizeWrapper", metrics.wrapper],
        ["snippet", "sizeSnippet", metrics.snippet],
      ];
      for (const [name, label, amounts] of measured) {
        const item = row(nodes["size-rows"], "size-row", t(label));
        item.container.setAttribute("data-metric", name);
        for (const [unit, unitLabel] of units) {
          pair(item.fields, t(unitLabel), String(amounts[unit]), unit, { "data-value": amounts[unit] });
        }
      }
      for (const [unit, label] of units) {
        nodes["size-equations"].appendChild(element("p", "lab-formula", t("sizeEquation", {
          unit: t(label), source: metrics.source[unit], escape: metrics.escapeExpansion[unit],
          wrapper: metrics.wrapper[unit], total: metrics.snippet[unit],
        })));
      }
      nodes["size-wrapper"].textContent = t("sizeWrapperBreakdown", {
        decoder: metrics.decoder.codePoints, syntax: metrics.fixedSyntax, digits: metrics.keyDigits, total: metrics.wrapper.codePoints,
      });
      pair(nodes["size-ratios"], t("sizeRatioCodePoints"), percent(metrics.ratios.codePoints, 1),
        "codePoints", { "data-value": metrics.ratios.codePoints });
      pair(nodes["size-ratios"], t("sizeRatioBytes"), percent(metrics.ratios.utf8Bytes, 1),
        "utf8Bytes", { "data-value": metrics.ratios.utf8Bytes });
      if (metrics.ratios.codePoints === null) {
        nodes["size-ratio-empty"].textContent = t("sizeRatioEmpty");
        nodes["size-ratio-empty"].hidden = false;
      }
      const isolated = metrics.source.loneSurrogates;
      nodes["size-lone-warning"].setAttribute("data-count", String(isolated));
      if (isolated) {
        nodes["size-lone-warning"].textContent = t("sizeLoneWarning", { count: isolated });
        nodes["size-lone-warning"].hidden = false;
      }
    }

    function renderFrequency(frequency) {
      nodes["frequency-count"].textContent = frequency.totalCount ? t("frequencyCount", {
        total: frequency.totalCount, unique: frequency.uniqueCount, shown: frequency.shownUnique,
      }) : t("frequencyEmpty");
      attributes(nodes["frequency-count"], {
        "data-total": frequency.totalCount, "data-unique": frequency.uniqueCount, "data-shown": frequency.shownUnique,
      });
      nodes["frequency-rows"].setAttribute("tabindex", frequency.shownUnique ? "0" : "-1");
      for (const entry of frequency.rows) {
        const item = row(nodes["frequency-rows"], "frequency-row");
        item.container.setAttribute("data-source-cp", String(entry.sourceCP));
        pair(item.fields, t("frequencySourceLabel"), characterLabel(String.fromCodePoint(entry.sourceCP)), "source",
          { "data-code-point": entry.sourceCP, "data-source-derived": true }, true);
        pair(item.fields, t("frequencyPayloadLabel"), characterLabel(String.fromCodePoint(entry.payloadCP)), "payload",
          { "data-code-point": entry.payloadCP, "data-source-derived": true }, true);
        pair(item.fields, t("frequencyCountLabel"), String(entry.count), "count", { "data-value": entry.count });
        pair(item.fields, t("frequencyShareLabel"), percent(entry.share * 100, 2), "share", { "data-value": entry.share });
      }
      nodes["frequency-other"].textContent = t("frequencyOther", { other: frequency.otherCount });
      nodes["frequency-other"].setAttribute("data-count", String(frequency.otherCount));
      nodes["frequency-passed"].textContent = t("frequencyPassed", {
        count: frequency.passthroughCount,
        rate: percent(frequency.passthroughRate === null ? null : frequency.passthroughRate * 100, 2),
      });
      attributes(nodes["frequency-passed"], { "data-count": frequency.passthroughCount, "data-rate": frequency.passthroughRate });
      nodes["frequency-entropy"].textContent = t("frequencyEntropy", {
        source: frequency.entropy.source.toFixed(4), payload: frequency.entropy.payload.toFixed(4),
      });
      attributes(nodes["frequency-entropy"], { "data-source": frequency.entropy.source, "data-payload": frequency.entropy.payload });
      nodes["frequency-invariant"].textContent = t(frequency.entropy.invariant ? "frequencyInvariant" : "frequencyMismatch");
    }

    function generate(source, shift) {
      clear();
      inspector["btn-inspect-load"].disabled = !getCurrentOutput();
      const metrics = core.analyzeSource(source, shift);
      if (!metrics.ok) {
        nodes["lab-status"].textContent = metrics.reason === "tooLarge"
          ? t("labTooLarge", { limit: core.MAX_SOURCE_CODE_UNITS.toLocaleString("en-US") }) : t("labUnavailable");
        nodes["lab-status"].setAttribute("data-state", metrics.reason === "tooLarge" ? "tooLarge" : "error");
        return metrics;
      }
      const trace = core.traceSource(source, shift);
      const frequency = core.frequencyAnalysis(source, shift);
      renderTrace(trace, shift);
      renderSizes(metrics);
      renderFrequency(frequency);
      nodes["lab-status"].textContent = t("labReady", { count: metrics.source.codePoints, shift });
      nodes["lab-status"].setAttribute("data-state", "ready");
      return { ok: true };
    }

    function renderInspection() {
      for (const id of ["inspect-source", "inspect-key", "inspect-length", "inspect-comparison", "inspect-error", "inspect-lone-warning"]) {
        inspector[id].textContent = "";
      }
      inspector["inspect-key"].setAttribute("data-value", "");
      attributes(inspector["inspect-length"], { "data-code-points": "", "data-utf16-units": "", "data-utf8-bytes": "" });
      attributes(inspector["inspect-comparison"], {
        "data-state": "none", "data-code-point-index": "", "data-source-eof": "", "data-restored-eof": "",
      });
      inspector["inspect-error"].setAttribute("data-reason", "");
      inspector["inspect-lone-warning"].hidden = true;
      inspector["inspect-lone-warning"].setAttribute("data-count", "");
      attributes(inspector["inspect-status"], {
        "data-state": inspectionPhase,
        "data-origin": originalSource !== null ? "loaded" : inspectionPhase === "empty" ? "none" : "manual",
      });
      if (inspectionPhase === "empty") {
        inspector["inspect-status"].textContent = t("inspectEmpty");
      } else if (inspectionPhase === "pending") {
        inspector["inspect-status"].textContent = t(originalSource === null ? "inspectPendingManual" : "inspectPendingLoaded");
      } else if (inspectionPhase === "error") {
        inspector["inspect-status"].textContent = t("inspectFailed");
        const key = Object.hasOwn(errorKeys, inspectionReason) ? errorKeys[inspectionReason] : "inspectErrorGeneric";
        inspector["inspect-error"].textContent = t(key, { limit: core.MAX_INSPECT_CODE_UNITS.toLocaleString("en-US") });
        inspector["inspect-error"].setAttribute("data-reason", inspectionReason);
      } else {
        const result = inspectionResult;
        inspector["inspect-status"].textContent = t(originalSource === null ? "inspectSuccessManual" : "inspectSuccess");
        inspector["inspect-source"].textContent = result.source;
        inspector["inspect-key"].textContent = t("inspectKey", { key: result.shift });
        inspector["inspect-key"].setAttribute("data-value", String(result.shift));
        inspector["inspect-length"].textContent = t("inspectLength", {
          codePoints: result.length.codePoints, units: result.length.utf16Units, bytes: result.length.utf8Bytes,
        });
        attributes(inspector["inspect-length"], {
          "data-code-points": result.length.codePoints,
          "data-utf16-units": result.length.utf16Units, "data-utf8-bytes": result.length.utf8Bytes,
        });
        const comparison = result.comparison;
        if (comparison === null) {
          inspector["inspect-comparison"].textContent = t("inspectNoComparison");
        } else if (comparison.equal) {
          inspector["inspect-comparison"].textContent = t("inspectEqual");
          inspector["inspect-comparison"].setAttribute("data-state", "equal");
        } else {
          const mismatch = comparison.firstMismatch;
          inspector["inspect-comparison"].textContent = t("inspectDifferent", {
            index: mismatch.codePointIndex + 1,
            source: t(mismatch.sourceEof ? "inspectEof" : "inspectPresent"),
            restored: t(mismatch.restoredEof ? "inspectEof" : "inspectPresent"),
          });
          attributes(inspector["inspect-comparison"], {
            "data-state": "different", "data-code-point-index": mismatch.codePointIndex,
            "data-source-eof": mismatch.sourceEof, "data-restored-eof": mismatch.restoredEof,
          });
        }
        inspector["inspect-lone-warning"].setAttribute("data-count", String(result.loneSurrogates));
        if (result.loneSurrogates) {
          inspector["inspect-lone-warning"].textContent = t("inspectLoneWarning", { count: result.loneSurrogates });
          inspector["inspect-lone-warning"].hidden = false;
        }
      }
    }

    function resetInspection(phase) {
      inspectionResult = null;
      inspectionReason = "";
      inspectionPhase = phase;
      renderInspection();
    }

    inspector["btn-inspect-load"].addEventListener("click", () => {
      const current = getCurrentOutput();
      if (!current || typeof current.snippet !== "string" || typeof current.source !== "string") {
        inspector["btn-inspect-load"].disabled = true;
        return;
      }
      inspector["inspect-input"].value = current.snippet;
      originalSource = current.source;
      resetInspection("pending");
    });

    inspector["inspect-input"].addEventListener("input", () => {
      originalSource = null;
      resetInspection(inspector["inspect-input"].value === "" ? "empty" : "pending");
    });

    inspector["btn-inspect-clear"].addEventListener("click", () => {
      inspector["inspect-input"].value = "";
      originalSource = null;
      resetInspection("empty");
    });

    inspector["btn-inspect"].addEventListener("click", () => {
      const result = core.inspectSnippet(inspector["inspect-input"].value);
      if (!result.ok) {
        inspectionResult = null;
        inspectionReason = result.reason;
        inspectionPhase = "error";
      } else {
        // Never compare a textarea or a rendered/normalized version of the restored source.
        inspectionResult = {
          source: result.source, shift: result.shift, length: core.size(result.source),
          loneSurrogates: core.loneSurrogates(result.source),
          comparison: originalSource === null ? null : core.compareSource(originalSource, result.source),
        };
        inspectionReason = "";
        inspectionPhase = "success";
      }
      renderInspection();
    });

    function refreshLanguage() {
      renderInspection();
    }

    clear();
    renderInspection();
    return Object.freeze({ generate, clear, refreshLanguage });
  }

  return Object.freeze({ create });
});
