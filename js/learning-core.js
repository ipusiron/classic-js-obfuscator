/* Non-executing learning helpers shared by classic-script browsers and Node tests. */
(function (root, factory) {
  "use strict";

  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./obfuscator-core.js"));
  } else {
    root.LearningCore = factory(root.ObfuscatorCore);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (core) {
  "use strict";

  const MAX_INSPECT_CODE_UNITS = 2_000_000;
  const MAX_SOURCE_CODE_UNITS = 100_000;
  const MAX_TRACE_ROWS = 200;
  const MAX_FREQUENCY_ROWS = 20;
  const encoder = new TextEncoder();

  function fail(reason) {
    return { ok: false, reason };
  }

  function validShift(shift) {
    return Number.isInteger(shift) && shift >= 0 && shift <= 94;
  }

  function normalizeEnvelope(input) {
    if (typeof input !== "string") return fail("notString");
    if (input === "") return fail("emptyInput");
    if (input.length > MAX_INSPECT_CODE_UNITS) return fail("tooLarge");
    const containsCrlf = input.includes("\r\n");
    const withoutCrlf = input.replace(/\r\n/g, "");
    if (withoutCrlf.includes("\r")) return fail("bareCarriageReturn");
    if (containsCrlf && withoutCrlf.includes("\n")) return fail("mixedLineEndings");
    let normalized = input.replace(/\r\n/g, "\n");
    const terminalEol = normalized.endsWith("\n");
    if (terminalEol) normalized = normalized.slice(0, -1);
    return { ok: true, normalized, lineEndings: containsCrlf ? "CRLF" : "LF", terminalEol };
  }

  function decodePayloadLiteral(raw) {
    if (typeof raw !== "string") return fail("notString");
    if (raw.length > MAX_INSPECT_CODE_UNITS) return fail("tooLarge");
    const pieces = [];
    for (let index = 0; index < raw.length; index++) {
      const character = raw[index];
      const code = raw.charCodeAt(index);
      if (character !== core.BS) {
        if (character === '"' || character === "<" || code < 32 || code === 127 ||
            code === 0x2028 || code === 0x2029) return fail("rawLiteralCharacter");
        pieces.push(character);
        continue;
      }

      const escape = raw[++index];
      if (escape === core.BS || escape === '"') pieces.push(escape);
      else if (escape === "n") pieces.push("\n");
      else if (escape === "r") pieces.push("\r");
      else if (escape === "x") {
        const digits = raw.slice(index + 1, index + 3);
        if (!/^[0-9A-F]{2}$/.test(digits)) return fail("invalidEscape");
        const value = Number.parseInt(digits, 16);
        const emitted = (value < 32 && value !== 10 && value !== 13) || value === 127 || value === 60;
        if (!emitted) return fail("noncanonicalEscape");
        pieces.push(String.fromCharCode(value));
        index += 2;
      } else if (escape === "u") {
        const digits = raw.slice(index + 1, index + 5);
        if (digits !== "2028" && digits !== "2029") return fail("invalidEscape");
        pieces.push(String.fromCharCode(Number.parseInt(digits, 16)));
        index += 4;
      } else return fail("invalidEscape");
    }
    const value = pieces.join("");
    if (core.escapeForJsString(value) !== raw) return fail("noncanonicalEscape");
    return { ok: true, value };
  }

  function inspectSnippet(input) {
    const normalization = normalizeEnvelope(input);
    if (!normalization.ok) return normalization;
    const { normalized, lineEndings, terminalEol } = normalization;
    const lines = normalized.split("\n");
    if (lines.length !== 7) return fail("lineCount");
    const fixed = [
      [0, "(function(){"],
      [1, "  const d = " + core.DECRYPT_SRC + ";"],
      [4, "  const dec = d(enc, sft);"],
      [5, "  (0, eval)(dec);"],
      [6, "})();"],
    ];
    if (fixed.some(([index, expected]) => lines[index] !== expected)) return fail("envelopeMismatch");

    const shiftLine = lines[3].match(/^  const sft = ([0-9]|[1-8][0-9]|9[0-4]);$/);
    if (!shiftLine) return fail("invalidShift");
    const shift = Number(shiftLine[1]);
    const payloadPrefix = '  const enc = "';
    if (!lines[2].startsWith(payloadPrefix) || !lines[2].endsWith('";')) return fail("payloadEnvelope");
    const literalBody = lines[2].slice(payloadPrefix.length, -2);
    const decoded = decodePayloadLiteral(literalBody);
    if (!decoded.ok) return decoded;
    const source = core.caesarShift(decoded.value, -shift);
    // Exact serialization prevents accepting equivalent but noncanonical syntax.
    if (core.buildSnippet(source, shift) !== normalized) return fail("noncanonicalSnippet");
    return {
      ok: true,
      shift,
      source,
      payload: decoded.value,
      literalBody,
      canonicalSnippet: normalized,
      normalization: { lineEndings, terminalEol },
    };
  }

  function size(text) {
    return {
      codePoints: [...text].length,
      utf16Units: text.length,
      utf8Bytes: encoder.encode(text).length,
    };
  }

  function sizeDifference(left, right) {
    return {
      codePoints: left.codePoints - right.codePoints,
      utf16Units: left.utf16Units - right.utf16Units,
      utf8Bytes: left.utf8Bytes - right.utf8Bytes,
    };
  }

  function loneSurrogates(text) {
    let count = 0;
    for (const character of text) {
      const value = character.codePointAt(0);
      if (value >= 0xD800 && value <= 0xDFFF) count++;
    }
    return count;
  }

  function analyzeSource(source, shift) {
    if (typeof source !== "string") return fail("notString");
    if (source.length > MAX_SOURCE_CODE_UNITS) return fail("tooLarge");
    if (!validShift(shift)) return fail("invalidShift");
    const payload = core.caesarShift(source, shift);
    const literalBody = core.escapeForJsString(payload);
    const snippet = core.buildSnippet(source, shift);
    const originalSize = size(source);
    const payloadSize = size(payload);
    const literalSize = size(literalBody);
    const snippetSize = size(snippet);
    const wrapper = size(core.buildSnippet("", shift));
    const decoder = size(core.DECRYPT_SRC);
    const counts = core.stats(source, snippet);
    const keyDigits = String(shift).length;
    return {
      ok: true,
      shift,
      source: {
        ...originalSize,
        shifted: counts.shifted,
        passthrough: counts.passed,
        loneSurrogates: loneSurrogates(source),
      },
      payload: payloadSize,
      literalBody: literalSize,
      escapeExpansion: sizeDifference(literalSize, payloadSize),
      decoder,
      fixedSyntax: wrapper.codePoints - decoder.codePoints - keyDigits,
      keyDigits,
      wrapper,
      snippet: snippetSize,
      ratios: {
        codePoints: counts.ratio,
        utf8Bytes: originalSize.utf8Bytes
          ? Math.round((snippetSize.utf8Bytes / originalSize.utf8Bytes) * 1000) / 10 : null,
      },
    };
  }

  function traceSource(source, shift, limit = MAX_TRACE_ROWS) {
    if (typeof source !== "string") return fail("notString");
    if (source.length > MAX_SOURCE_CODE_UNITS) return fail("tooLarge");
    if (!validShift(shift)) return fail("invalidShift");
    if (!Number.isInteger(limit) || limit < 0 || limit > MAX_TRACE_ROWS) return fail("invalidLimit");
    const rows = [];
    let index = 0;
    for (const character of source) {
      if (rows.length < limit) {
        const sourceCodePoint = character.codePointAt(0);
        const payload = core.caesarShift(character, shift);
        const literalBody = core.escapeForJsString(payload);
        rows.push({
          index,
          source: character,
          sourceCodePoint,
          shifted: sourceCodePoint >= 32 && sourceCodePoint <= 126,
          payload,
          payloadCodePoint: payload.codePointAt(0),
          literalBody,
          sourceSize: size(character),
          literalSize: size(literalBody),
          loneSurrogate: sourceCodePoint >= 0xD800 && sourceCodePoint <= 0xDFFF,
        });
      }
      index++;
    }
    return { ok: true, total: index, shown: rows.length, truncated: index > rows.length, rows };
  }

  function frequencyAnalysis(source, shift, limit = MAX_FREQUENCY_ROWS) {
    if (typeof source !== "string") return fail("notString");
    if (source.length > MAX_SOURCE_CODE_UNITS) return fail("tooLarge");
    if (!validShift(shift)) return fail("invalidShift");
    if (!Number.isInteger(limit) || limit < 0 || limit > MAX_FREQUENCY_ROWS) return fail("invalidLimit");

    const counts = new Map();
    let totalCount = 0;
    let passthroughCount = 0;
    for (const character of source) {
      const code = character.codePointAt(0);
      counts.set(code, (counts.get(code) || 0) + 1);
      totalCount++;
      if (code < 32 || code > 126) passthroughCount++;
    }
    const sorted = [...counts].sort(([leftCP, leftCount], [rightCP, rightCount]) =>
      rightCount - leftCount || leftCP - rightCP);
    const rows = sorted.slice(0, limit).map(([sourceCP, count]) => ({
      sourceCP,
      payloadCP: core.caesarShift(String.fromCodePoint(sourceCP), shift).codePointAt(0),
      count,
      // A fraction in [0, 1]; percentage formatting belongs to the UI.
      share: count / totalCount,
    }));
    const sourceEntropy = core.entropy(source);
    const payloadEntropy = core.entropy(core.caesarShift(source, shift));
    return {
      ok: true,
      totalCount,
      uniqueCount: counts.size,
      shownUnique: rows.length,
      otherCount: totalCount - rows.reduce((sum, row) => sum + row.count, 0),
      passthroughCount,
      passthroughRate: totalCount ? passthroughCount / totalCount : null,
      entropy: {
        source: sourceEntropy,
        payload: payloadEntropy,
        invariant: Math.abs(sourceEntropy - payloadEntropy) <= 1e-12,
      },
      rows,
    };
  }

  function compareSource(source, restored) {
    if (typeof source !== "string" || typeof restored !== "string") return fail("notString");
    if (source === restored) return { ok: true, equal: true, firstMismatch: null };
    let sourceOffset = 0;
    let restoredOffset = 0;
    let codePointIndex = 0;
    while (sourceOffset < source.length && restoredOffset < restored.length) {
      const expected = source.codePointAt(sourceOffset);
      const actual = restored.codePointAt(restoredOffset);
      if (expected !== actual) break;
      sourceOffset += expected > 0xFFFF ? 2 : 1;
      restoredOffset += actual > 0xFFFF ? 2 : 1;
      codePointIndex++;
    }
    return {
      ok: true,
      equal: false,
      firstMismatch: {
        codePointIndex,
        sourceEof: sourceOffset === source.length,
        restoredEof: restoredOffset === restored.length,
      },
    };
  }

  return {
    MAX_INSPECT_CODE_UNITS, MAX_SOURCE_CODE_UNITS, MAX_TRACE_ROWS, MAX_FREQUENCY_ROWS,
    normalizeEnvelope, decodePayloadLiteral, inspectSnippet, size, loneSurrogates,
    analyzeSource, traceSource, frequencyAnalysis, compareSource,
  };
});
