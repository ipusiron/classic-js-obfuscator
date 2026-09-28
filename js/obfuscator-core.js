/* Pure Caesar transformation helpers, shared by the browser and Node tests. */
(function (root, factory) {
  "use strict";

  const core = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = core;
  } else {
    root.ObfuscatorCore = core;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const BS = String.fromCharCode(92);
  const FIRST = 32;
  const SIZE = 95;

  // Keep the embedded decoder byte-for-byte compatible with the reference.
  const DECRYPT_SRC =
    'function(t,s){const b=32,n=95;let o="";for(let i=0;i<t.length;i++){const c=t.charCodeAt(i);' +
    'if(c>=32&&c<=126){const dec=((c-b-((s%n)+n)%n+n)%n)+b;o+=String.fromCharCode(dec);}' +
    'else{o+=t[i];}}return o;}';

  function caesarShift(text, shift) {
    const normalizedShift = ((shift % SIZE) + SIZE) % SIZE;
    let result = "";
    for (let index = 0; index < text.length; index++) {
      const code = text.charCodeAt(index);
      result += code >= FIRST && code < FIRST + SIZE
        ? String.fromCharCode(((code - FIRST + normalizedShift) % SIZE) + FIRST)
        : text[index];
    }
    return result;
  }

  function hex2(code) {
    return code.toString(16).toUpperCase().padStart(2, "0");
  }

  function escapeForJsString(text) {
    let result = "";
    for (const character of text) {
      const code = character.codePointAt(0);
      if (character === BS) result += BS + BS;
      else if (character === '"') result += BS + '"';
      else if (code === 10) result += BS + "n";
      else if (code === 13) result += BS + "r";
      else if (character === "<") result += BS + "x3C";
      else if (code < 32 || code === 127) result += BS + "x" + hex2(code);
      else if (code === 0x2028 || code === 0x2029) {
        result += BS + "u" + code.toString(16).toUpperCase();
      } else result += character;
    }
    return result;
  }

  function parseShift(input) {
    const text = String(input).trim();
    if (!/^[0-9]+$/.test(text)) {
      return { ok: false, reason: text === "" ? "empty" : "notInteger" };
    }
    const value = Number(text);
    if (value > 94) return { ok: false, reason: "outOfRange" };
    return { ok: true, value, noop: value === 0 };
  }

  function buildSnippet(code, shift) {
    const encrypted = caesarShift(code, shift);
    return "(function(){\n" +
      "  const d = " + DECRYPT_SRC + ";\n" +
      '  const enc = "' + escapeForJsString(encrypted) + '";\n' +
      "  const sft = " + shift + ";\n" +
      "  const dec = d(enc, sft);\n" +
      "  (0, eval)(dec);\n" +
      "})();";
  }

  function stats(code, snippet) {
    let shifted = 0;
    let passed = 0;
    for (const character of code) {
      const value = character.codePointAt(0);
      if (value >= FIRST && value < FIRST + SIZE) shifted++;
      else passed++;
    }
    const length = shifted + passed;
    const snippetLength = [...snippet].length;
    return {
      length,
      shifted,
      passed,
      snippetLength,
      ratio: length ? Math.round((snippetLength / length) * 1000) / 10 : null,
    };
  }

  function entropy(text) {
    const frequencies = new Map();
    let length = 0;
    for (const character of text) {
      frequencies.set(character, (frequencies.get(character) || 0) + 1);
      length++;
    }
    let result = 0;
    for (const count of frequencies.values()) {
      const probability = count / length;
      result -= probability * Math.log2(probability);
    }
    return result;
  }

  return { caesarShift, escapeForJsString, parseShift, buildSnippet, stats, entropy, DECRYPT_SRC, BS };
});
