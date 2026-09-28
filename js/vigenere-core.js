/* Printable-ASCII Vigenere variant. Pure data transforms; no dynamic execution. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./obfuscator-core.js"), require("./learning-core.js"));
  } else root.VigenereCore = factory(root.ObfuscatorCore, root.LearningCore);
})(typeof globalThis !== "undefined" ? globalThis : this, function (core, learning) {
  "use strict";

  const LIMIT = 2_000_000;
  const KEY_LIMIT = 128;
  const TRACE_LIMIT = 200;
  const DECODER = 'function(t,k){let o="",j=0;for(let i=0;i<t.length;i++){const c=t.charCodeAt(i);' +
    'if(c>=32&&c<=126){const s=k.charCodeAt(j++%k.length)-65;o+=String.fromCharCode((c-32-s+95)%95+32);}' +
    'else{o+=t[i];}}return o;}';

  function parseKey(input) {
    if (typeof input !== "string" || input.length > LIMIT) return { ok: false, reason: "invalidKey" };
    const value = input.trim();
    if (!/^[A-Za-z]{1,128}$/.test(value)) return { ok: false, reason: value === "" ? "emptyKey" : "invalidKey" };
    return { ok: true, value: value.toUpperCase(), noop: /^a+$/i.test(value) };
  }

  function requireInput(text, key) {
    if (typeof text !== "string" || text.length > LIMIT) throw new RangeError("tooLarge");
    const parsed = parseKey(key);
    if (!parsed.ok) throw new TypeError(parsed.reason);
    return parsed.value;
  }

  function transform(text, rawKey, decrypt = false) {
    const key = requireInput(text, rawKey);
    const pieces = [];
    let cursor = 0;
    for (const character of text) {
      const code = character.codePointAt(0);
      if (code < 32 || code > 126) pieces.push(character);
      else {
        const shift = key.charCodeAt(cursor++ % key.length) - 65;
        pieces.push(String.fromCharCode((code - 32 + (decrypt ? 95 - shift : shift)) % 95 + 32));
      }
    }
    return pieces.join("");
  }

  function buildSnippet(source, rawKey) {
    const key = requireInput(source, rawKey);
    const payload = transform(source, key);
    const snippet = "(function(){\n" +
      "  const d = " + DECODER + ";\n" +
      '  const enc = "' + core.escapeForJsString(payload) + '";\n' +
      '  const key = "' + key + '";\n' +
      "  const dec = d(enc, key);\n" +
      "  (0, eval)(dec);\n" +
      "})();";
    if (snippet.length > LIMIT) throw new RangeError("tooLarge");
    return snippet;
  }

  function inspectSnippet(input) {
    const normalized = learning.normalizeEnvelope(input);
    if (!normalized.ok) return normalized;
    const lines = normalized.normalized.split("\n");
    const fail = reason => ({ ok: false, reason });
    if (lines.length !== 7) return fail("lineCount");
    const fixed = [[0, "(function(){"], [1, "  const d = " + DECODER + ";"],
      [4, "  const dec = d(enc, key);"], [5, "  (0, eval)(dec);"], [6, "})();"]];
    if (fixed.some(([i, text]) => lines[i] !== text)) return fail("envelopeMismatch");
    const key = lines[3].match(/^  const key = "([A-Z]{1,128})";$/)?.[1];
    if (!key) return fail("invalidKey");
    const prefix = '  const enc = "';
    if (!lines[2].startsWith(prefix) || !lines[2].endsWith('";')) return fail("payloadEnvelope");
    const decoded = learning.decodePayloadLiteral(lines[2].slice(prefix.length, -2));
    if (!decoded.ok) return decoded;
    const source = transform(decoded.value, key, true);
    if (buildSnippet(source, key) !== normalized.normalized) return fail("noncanonicalSnippet");
    return { ok: true, source, key, payload: decoded.value, lineEndings: normalized.lineEndings };
  }

  function trace(source, rawKey) {
    const key = requireInput(source, rawKey);
    const rows = [];
    let cursor = 0;
    for (const character of source) {
      if (rows.length === TRACE_LIMIT) break;
      const input = character.codePointAt(0);
      const shifted = input >= 32 && input <= 126;
      const keyIndex = shifted ? cursor++ % key.length : null;
      const shift = shifted ? key.charCodeAt(keyIndex) - 65 : null;
      rows.push({ index: rows.length, input, keyIndex, shift,
        output: shifted ? (input - 32 + shift) % 95 + 32 : input });
    }
    return rows;
  }

  return Object.freeze({ LIMIT, KEY_LIMIT, TRACE_LIMIT, DECODER, parseKey, transform, buildSnippet, inspectSnippet, trace });
});
