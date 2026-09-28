/* Exact string comparison with bounded code-point excerpts. No display or execution. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ComparisonContext = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const LIMIT = 2_000_000;
  const RADIUS = 16;

  function compare(source, restored) {
    if (typeof source !== "string" || typeof restored !== "string") return { ok: false, reason: "notString" };
    if (source.length > LIMIT || restored.length > LIMIT) return { ok: false, reason: "tooLarge" };
    if (source === restored) return { ok: true, equal: true, index: null, source: null, restored: null };
    const leftIterator = source[Symbol.iterator]();
    const rightIterator = restored[Symbol.iterator]();
    let index = 0;
    while (true) {
      const left = leftIterator.next();
      const right = rightIterator.next();
      if (left.done || right.done || left.value !== right.value) break;
      index++;
    }

    function excerpt(text) {
      const start = Math.max(0, index - RADIUS);
      const end = index + RADIUS + 1;
      const tokens = [];
      let count = 0;
      for (const character of text) {
        if (count >= start && count < end) {
          tokens.push({ index: count, codePoint: character.codePointAt(0), atMismatch: count === index });
        }
        count++;
      }
      return { start, total: count, prefixOmitted: start > 0, suffixOmitted: count > end,
        eofAtMismatch: index === count, tokens };
    }

    return { ok: true, equal: false, index, source: excerpt(source), restored: excerpt(restored) };
  }

  return Object.freeze({ LIMIT, RADIUS, compare });
});
