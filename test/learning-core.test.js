"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const learning = require("../js/learning-core.js");
const core = require("../js/obfuscator-core.js");
const fixture = require("./fixtures/expect.json");
const expected = require("./fixtures/learning-expect.json");
const fs = require("node:fs");
const vm = require("node:vm");
const BS = String.fromCharCode(92);
const controlCharacters = Array.from({ length: 32 }, (_, index) => String.fromCharCode(index)).join("");
const printable = Array.from({ length: 95 }, (_, index) => String.fromCharCode(32 + index)).join("");
const unicode = String.fromCodePoint(0x65E5, 0x672C, 0x1F600, 0xE9, 0x65, 0x301, 0x2028, 0x2029);
const lone = String.fromCharCode(0xD800, 0x41, 0xDC00);
const cases = ["", "Plain sample", printable, controlCharacters, unicode, lone, '"' + BS + "<>"];

function replacePayload(snippet, body) {
  const lines = snippet.split("\n");
  lines[2] = '  const enc = "' + body + '";';
  return lines.join("\n");
}

function assertRejected(input) {
  const result = learning.inspectSnippet(input);
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result).sort(), ["ok", "reason"]);
  assert.equal(typeof result.reason, "string");
}

test("strict inspection round-trips every allowed shift without executing the source", () => {
  globalThis.__day042Phase2Executed = false;
  try {
    const inertAssignment = "globalThis.__day042Phase2Executed = true;";
    for (let shift = 0; shift < 95; shift++) {
      for (const source of [...cases, inertAssignment]) {
        const result = learning.inspectSnippet(core.buildSnippet(source, shift));
        assert.equal(result.ok, true);
        assert.equal(result.shift, shift);
        assert.equal(result.source, source);
        assert.equal(result.payload, core.caesarShift(source, shift));
      }
    }
    assert.equal(globalThis.__day042Phase2Executed, false);
  } finally {
    delete globalThis.__day042Phase2Executed;
  }
});

test("LF or CRLF and exactly zero or one terminal EOL normalize to the canonical snippet", () => {
  const canonical = core.buildSnippet(fixture.sample, 3);
  for (const eol of ["\n", "\r\n"]) {
    for (const terminal of [false, true]) {
      const input = canonical.replace(/\n/g, eol) + (terminal ? eol : "");
      const result = learning.inspectSnippet(input);
      assert.equal(result.ok, true);
      assert.equal(result.canonicalSnippet, canonical);
      assert.deepEqual(result.normalization, { lineEndings: eol === "\n" ? "LF" : "CRLF", terminalEol: terminal });
    }
  }
  assertRejected(canonical.replace("\n", "\r\n"));
  assertRejected(canonical.replace("\n", "\r"));
  assertRejected(canonical + "\n\n");
  assertRejected(canonical.replace(/\n/g, "\r\n") + "\r\n\r\n");
});

test("empty inspection input is distinct from a valid generated empty-code snippet", () => {
  assert.deepEqual(learning.inspectSnippet(""), { ok: false, reason: "emptyInput" });
  assertRejected("\n");
  const empty = learning.inspectSnippet(core.buildSnippet("", 0));
  assert.equal(empty.ok, true);
  assert.equal(empty.source, "");
  assert.equal(empty.shift, 0);
});

test("only emitted escapes and raw characters are accepted, including lone surrogates", () => {
  for (const source of cases) {
    assert.deepEqual(learning.decodePayloadLiteral(core.escapeForJsString(source)), { ok: true, value: source });
  }
  const invalid = [
    BS, BS + "t", BS + "b", BS + "f", BS + "v", BS + "0", BS + "/", BS + "'",
    BS + "x0A", BS + "x0D", BS + "x41", BS + "x3c", BS + "x7f", BS + "x3", BS + "xGG",
    BS + "u0041", BS + "uD800", BS + "u{2028}", BS + "u202", BS + "U2028",
    BS + "\n", BS + "\r\n", "<", '"', String.fromCharCode(127), String.fromCharCode(0x2028),
  ];
  for (const raw of invalid) {
    assert.equal(learning.decodePayloadLiteral(raw).ok, false);
    assertRejected(replacePayload(core.buildSnippet("", 0), raw));
  }
  for (const character of controlCharacters) {
    assert.equal(learning.decodePayloadLiteral(character).ok, false);
  }
});

test("decoder edits, wrappers, extra statements, altered spacing and truncation are rejected", () => {
  const snippet = core.buildSnippet("Benign text", 3);
  const modified = [
    " " + snippet, snippet + " ", String.fromCharCode(0xFEFF) + snippet,
    "```javascript\n" + snippet + "\n```", "<script>" + snippet + "</script>",
    snippet + "\n1 + 1;", snippet + "1 + 1;", snippet.replace("return o;", "return t;"),
    snippet.replace("  const d", " const d"), snippet.replace("(0, eval)", "(eval)"),
    snippet.replace("})();", "})()"), snippet.replace("  const enc", "  let enc"),
    snippet.replace("  const sft", "  let sft"), snippet.replace('";\n  const sft', '" ;\n  const sft'),
  ];
  for (const input of modified) assertRejected(input);
  for (let index = 0; index < snippet.length; index++) {
    assertRejected(snippet.slice(0, index));
    assertRejected(snippet.slice(index + 1));
  }
});

test("the canonical key spelling is 0 through 94 without coercion or expressions", () => {
  const snippet = core.buildSnippet("text", 3);
  for (const key of ["03", "00", "95", "-1", "+3", "3.0", "3e0", "NaN", "Infinity", " 3", "3 ", "1+2"]) {
    assertRejected(snippet.replace("  const sft = 3;", "  const sft = " + key + ";"));
  }
  assertRejected(null);
  assertRejected({ toString: () => snippet });
  assertRejected(" ".repeat(learning.MAX_INSPECT_CODE_UNITS + 1));
});

test("comparison is exact and locates the first code-point mismatch or EOF without normalization", () => {
  assert.deepEqual(learning.compareSource("", ""), { ok: true, equal: true, firstMismatch: null });
  assert.deepEqual(learning.compareSource(lone, lone), { ok: true, equal: true, firstMismatch: null });
  const emoji = String.fromCodePoint(0x1F600);
  assert.deepEqual(learning.compareSource(emoji + "A", emoji + "B").firstMismatch,
    { codePointIndex: 1, sourceEof: false, restoredEof: false });
  assert.deepEqual(learning.compareSource(emoji, emoji + "A").firstMismatch,
    { codePointIndex: 1, sourceEof: true, restoredEof: false });
  assert.deepEqual(learning.compareSource(emoji + "A", emoji).firstMismatch,
    { codePointIndex: 1, sourceEof: false, restoredEof: true });
  assert.equal(learning.compareSource(String.fromCharCode(0xE9), "e" + String.fromCharCode(0x301)).equal, false);
  assert.equal(learning.compareSource("a\r\n", "a\n").firstMismatch.codePointIndex, 1);
});

test("size accounting decomposes exactly without counting the payload or quotes twice", () => {
  for (let shift = 0; shift < 95; shift++) {
    for (const source of cases) {
      const result = learning.analyzeSource(source, shift);
      assert.equal(result.ok, true);
      assert.equal(result.source.codePoints, result.source.shifted + result.source.passthrough);
      for (const unit of ["codePoints", "utf16Units", "utf8Bytes"]) {
        assert.equal(result.payload[unit], result.source[unit]);
        assert.equal(result.literalBody[unit] + result.wrapper[unit], result.snippet[unit]);
        assert.equal(result.source[unit] + result.escapeExpansion[unit] + result.wrapper[unit], result.snippet[unit]);
        assert.equal(result.decoder[unit] + result.fixedSyntax + result.keyDigits, result.wrapper[unit]);
      }
      assert.equal(result.fixedSyntax, 111);
      assert.equal(result.decoder.codePoints, 199);
    }
  }
});

test("reference sample measurements distinguish code points and actual UTF-8 bytes", () => {
  const actual = learning.analyzeSource(fixture.sample, 3);
  assert.deepEqual(actual.source, {
    codePoints: 175, utf16Units: 175, utf8Bytes: 225, shifted: 146, passthrough: 29, loneSurrogates: 0,
  });
  assert.deepEqual(actual.literalBody, { codePoints: 179, utf16Units: 179, utf8Bytes: 229 });
  assert.deepEqual(actual.snippet, { codePoints: 490, utf16Units: 490, utf8Bytes: 540 });
  assert.deepEqual(actual.ratios, { codePoints: 280, utf8Bytes: 240 });
  assert.deepEqual(learning.analyzeSource("", 94).wrapper, { codePoints: 312, utf16Units: 312, utf8Bytes: 312 });
  assert.deepEqual(learning.analyzeSource("", 0).ratios, { codePoints: null, utf8Bytes: null });
});

test("astral characters and lone surrogates document different string and UTF-8 lengths", async () => {
  const emoji = "A" + String.fromCodePoint(0x1F600);
  assert.deepEqual(learning.size(emoji), { codePoints: 2, utf16Units: 3, utf8Bytes: 5 });
  const isolated = String.fromCharCode(0xD800);
  assert.deepEqual(learning.size(isolated), { codePoints: 1, utf16Units: 1, utf8Bytes: 3 });
  assert.equal(learning.loneSurrogates(isolated), 1);
  assert.equal(learning.loneSurrogates(String.fromCodePoint(0x1F600)), 0);
  const snippet = core.buildSnippet(isolated, 3);
  assert.equal(learning.inspectSnippet(snippet).source, isolated);
  const saved = await new Blob([snippet]).text();
  assert.equal(learning.inspectSnippet(saved).source, String.fromCharCode(0xFFFD));
  assert.equal(learning.compareSource(isolated, learning.inspectSnippet(saved).source).equal, false);
  assert.equal(new Blob([snippet]).size, learning.size(snippet).utf8Bytes);
});

test("trace rows use code points, preserve strings as data, and have a bounded visible prefix", () => {
  const source = "A" + String.fromCodePoint(0x1F600) + "e" + String.fromCharCode(0x301) + lone;
  const complete = learning.traceSource(source, 3);
  assert.equal(complete.ok, true);
  assert.equal(complete.rows.map((row) => row.payload).join(""), core.caesarShift(source, 3));
  assert.equal(complete.rows.map((row) => row.literalBody).join(""), core.escapeForJsString(core.caesarShift(source, 3)));
  assert.equal(complete.rows[1].sourceSize.utf16Units, 2);
  assert.equal(complete.rows[1].index, 1);
  const limited = learning.traceSource(source, 3, 2);
  assert.equal(limited.shown, 2);
  assert.equal(limited.truncated, true);
  assert.equal(limited.total, [...source].length);
  assert.equal(learning.traceSource(source, 3, learning.MAX_TRACE_ROWS + 1).ok, false);
  assert.equal(learning.traceSource("x".repeat(201), 3).shown, 200);
});

test("frequency distribution maps all source code points through every allowed shift", () => {
  const source = "AABC" + printable + controlCharacters + unicode + lone;
  for (let shift = 0; shift < 95; shift++) {
    const result = learning.frequencyAnalysis(source, shift);
    assert.equal(result.ok, true);
    assert.equal(result.totalCount, [...source].length);
    assert.equal(result.uniqueCount, new Set(source).size);
    assert.equal(result.rows.reduce((sum, row) => sum + row.count, 0) + result.otherCount, result.totalCount);
    const payload = core.caesarShift(source, shift);
    for (const row of result.rows) {
      assert.equal(row.payloadCP, core.caesarShift(String.fromCodePoint(row.sourceCP), shift).codePointAt(0));
      assert.equal([...source].filter((character) => character.codePointAt(0) === row.sourceCP).length, row.count);
      assert.equal([...payload].filter((character) => character.codePointAt(0) === row.payloadCP).length, row.count);
      assert.equal(row.share, row.count / result.totalCount);
    }
    assert.equal(result.entropy.invariant, true);
    assert.ok(Math.abs(result.entropy.source - result.entropy.payload) <= 1e-12);
    assert.equal(result.entropy.source, core.entropy(source));
    assert.equal(result.entropy.payload, core.entropy(payload));
  }
});

test("frequency analysis distinguishes empty input and orders equal counts by numeric code point", () => {
  assert.deepEqual(learning.frequencyAnalysis("", 0), {
    ok: true, totalCount: 0, uniqueCount: 0, shownUnique: 0, otherCount: 0,
    passthroughCount: 0, passthroughRate: null,
    entropy: { source: 0, payload: 0, invariant: true }, rows: [],
  });
  const emoji = String.fromCodePoint(0x1F600);
  const result = learning.frequencyAnalysis(emoji + "CBBA" + String.fromCharCode(0xE9), 3);
  assert.deepEqual(result.rows.map((row) => row.sourceCP), [66, 65, 67, 0xE9, 0x1F600]);
  assert.equal(result.rows[0].count, 2);
  assert.equal(result.passthroughCount, 2);
  assert.equal(result.passthroughRate, 2 / 6);
  assert.equal(learning.frequencyAnalysis("A", 0, 21).ok, false);
  assert.equal(learning.frequencyAnalysis("A", 0, -1).ok, false);
});

test("top-20 frequency rows leave other counts visible and do not truncate the statistics", () => {
  const source = Array.from({ length: 21 }, (_, index) => String.fromCharCode(65 + index)).join("");
  const full = learning.frequencyAnalysis(source, 47);
  assert.equal(full.uniqueCount, 21);
  assert.equal(full.shownUnique, 20);
  assert.equal(full.rows.length, 20);
  assert.equal(full.rows[0].sourceCP, 65);
  assert.equal(full.rows[19].sourceCP, 84);
  assert.equal(full.otherCount, 1);
  assert.equal(full.entropy.source, core.entropy(source));
  const none = learning.frequencyAnalysis(source, 47, 0);
  assert.equal(none.shownUnique, 0);
  assert.equal(none.otherCount, 21);
  assert.deepEqual(none.entropy, full.entropy);
  assert.equal(none.totalCount, full.totalCount);
});

test("trace row limits at 199, 200 and 201 code points affect only presentation", () => {
  for (const length of [199, 200, 201]) {
    const result = learning.traceSource("A".repeat(length), 3);
    assert.equal(result.total, length);
    assert.equal(result.shown, Math.min(length, 200));
    assert.equal(result.rows.length, Math.min(length, 200));
    assert.equal(result.truncated, length > 200);
  }
});

test("learning-only source limits accept 99999 and 100000 UTF-16 units and reject 100001", () => {
  assert.equal(learning.MAX_SOURCE_CODE_UNITS, 100000);
  for (const length of [99999, 100000, 100001]) {
    const source = "A".repeat(length);
    for (const analyze of [learning.analyzeSource, learning.traceSource, learning.frequencyAnalysis]) {
      const result = analyze(source, 3);
      if (length > learning.MAX_SOURCE_CODE_UNITS) assert.deepEqual(result, { ok: false, reason: "tooLarge" });
      else assert.equal(result.ok, true);
    }
    // Generation remains governed by the original core, not this learning limit.
    assert.equal(learning.inspectSnippet(core.buildSnippet(source, 3)).source, source);
  }
  const astral = String.fromCodePoint(0x1F600).repeat(50000);
  assert.equal(learning.frequencyAnalysis(astral, 3).totalCount, 50000);
  assert.deepEqual(learning.traceSource(astral + "A", 3), { ok: false, reason: "tooLarge" });
});

test("inspection accepts canonical snippets at 2M minus one and exactly 2M UTF-16 units", () => {
  const wrapperLength = core.buildSnippet("", 0).length;
  for (const delta of [-1, 0, 1]) {
    const length = learning.MAX_INSPECT_CODE_UNITS + delta;
    const source = "A".repeat(length - wrapperLength);
    const snippet = core.buildSnippet(source, 0);
    assert.equal(snippet.length, length);
    const result = learning.inspectSnippet(snippet);
    if (delta > 0) assert.deepEqual(result, { ok: false, reason: "tooLarge" });
    else {
      assert.equal(result.ok, true);
      assert.equal(result.source, source);
    }
  }
});

test("every deterministic metrics, frequency and comparison fixture matches in full", () => {
  const metricCases = [
    ["sample3", fixture.sample, 3], ["empty0", "", 0], ["empty94", "", 94],
    ["emoji", "A" + String.fromCodePoint(0x1F600), 3],
    ["lineSeparator", String.fromCharCode(0x2028), 3],
    ["loneHighSurrogate", String.fromCharCode(0xD800), 3],
    ["loneLowSurrogate", String.fromCharCode(0xDC00), 3],
  ];
  const actual = {
    limits: {
      inspectedUtf16Units: learning.MAX_INSPECT_CODE_UNITS,
      sourceUtf16Units: learning.MAX_SOURCE_CODE_UNITS,
      traceRows: learning.MAX_TRACE_ROWS,
      frequencyRows: learning.MAX_FREQUENCY_ROWS,
    },
    metrics: Object.fromEntries(metricCases.map(([name, source, shift]) => [name, learning.analyzeSource(source, shift)])),
    frequency: {
      sample3: learning.frequencyAnalysis(fixture.sample, 3),
      empty0: learning.frequencyAnalysis("", 0),
      ties3: learning.frequencyAnalysis("CABA" + String.fromCodePoint(0x1F600), 3),
      twentyOneTypes0: learning.frequencyAnalysis(Array.from({ length: 21 }, (_, index) =>
        String.fromCharCode(65 + index)).join(""), 0),
    },
    comparison: {
      exact: learning.compareSource("A", "A"),
      sourceEof: learning.compareSource("A", "AB"),
      restoredEof: learning.compareSource("AB", "A"),
      astralPrefix: learning.compareSource(String.fromCodePoint(0x1F600) + "A", String.fromCodePoint(0x1F600) + "B"),
      noNfc: learning.compareSource(String.fromCharCode(0xE9), "e" + String.fromCharCode(0x301)),
    },
  };
  assert.deepEqual(actual, expected);
  const encoder = new TextEncoder();
  for (const [, source, shift] of metricCases) {
    const metrics = learning.analyzeSource(source, shift);
    const payload = core.caesarShift(source, shift);
    const parts = {
      source, payload, literalBody: core.escapeForJsString(payload),
      decoder: core.DECRYPT_SRC, wrapper: core.buildSnippet("", shift), snippet: core.buildSnippet(source, shift),
    };
    for (const [name, text] of Object.entries(parts)) {
      assert.equal(metrics[name].codePoints, [...text].length);
      assert.equal(metrics[name].utf16Units, text.length);
      assert.equal(metrics[name].utf8Bytes, encoder.encode(text).length);
      assert.equal(metrics[name].utf8Bytes, new Blob([text]).size);
    }
  }
});

test("classic-script exports are DOM-free and inspection cannot evaluate its input", () => {
  const calls = { eval: 0, Function: 0, dom: 0, network: 0 };
  const document = new Proxy({}, {
    get() {
      calls.dom++;
      throw new Error("Unexpected DOM access");
    },
  });
  const context = vm.createContext({
    TextEncoder,
    document,
    eval() {
      calls.eval++;
      throw new Error("Unexpected evaluation");
    },
    Function: function () {
      calls.Function++;
      throw new Error("Unexpected function construction");
    },
    fetch() {
      calls.network++;
      throw new Error("Unexpected network request");
    },
    __learningExecuted: false,
  }, { codeGeneration: { strings: false, wasm: false } });
  const files = ["../js/obfuscator-core.js", "../js/learning-core.js"];
  for (const file of files) {
    vm.runInContext(fs.readFileSync(require.resolve(file), "utf8"), context, { timeout: 1000 });
  }
  assert.deepEqual(Object.keys(context.LearningCore).sort(), Object.keys(learning).sort());
  assert.equal(Object.hasOwn(context.LearningCore, "summary"), false);
  const marker = "globalThis.__learningExecuted = true;";
  for (let shift = 0; shift < 95; shift++) {
    const result = context.LearningCore.inspectSnippet(core.buildSnippet(marker, shift));
    assert.equal(result.ok, true);
    assert.equal(result.source, marker);
    assert.equal(context.LearningCore.analyzeSource(fixture.sample, shift).ok, true);
    assert.equal(context.LearningCore.traceSource(unicode, shift).ok, true);
    assert.equal(context.LearningCore.frequencyAnalysis(unicode, shift).ok, true);
  }
  assert.equal(context.__learningExecuted, false);
  assert.deepEqual(calls, { eval: 0, Function: 0, dom: 0, network: 0 });
});

test("public validation rejects non-string inputs without touching prototypes or coercion hooks", () => {
  let coercions = 0;
  const coercible = {
    toString() {
      coercions++;
      throw new Error("Unexpected string coercion");
    },
    [Symbol.toPrimitive]() {
      coercions++;
      throw new Error("Unexpected primitive coercion");
    },
  };
  const trapped = new Proxy({}, {
    get() {
      coercions++;
      throw new Error("Unexpected property access");
    },
  });
  const invalid = [
    undefined, null, false, true, 0, 3, NaN, Infinity, 3n, Symbol("text"),
    [], ["text"], {}, new String("text"), Object.create(null), Object.create(String.prototype), coercible, trapped,
  ];
  const validate = [
    learning.normalizeEnvelope, learning.decodePayloadLiteral, learning.inspectSnippet,
    (source) => learning.analyzeSource(source, 0),
    (source) => learning.traceSource(source, 0),
    (source) => learning.frequencyAnalysis(source, 0),
    (source) => learning.compareSource(source, ""),
    (source) => learning.compareSource("", source),
  ];
  for (const value of invalid) {
    for (const check of validate) assert.deepEqual(check(value), { ok: false, reason: "notString" });
  }
  assert.equal(coercions, 0);
});

test("shift and display limits require numeric integers without coercion", () => {
  const invalidShifts = [undefined, null, false, "3", "", NaN, Infinity, -Infinity, -1, 95, 3.5, {}, new Number(3), Symbol("3"), 3n];
  for (const shift of invalidShifts) {
    for (const analyze of [learning.analyzeSource, learning.traceSource, learning.frequencyAnalysis]) {
      assert.deepEqual(analyze("text", shift), { ok: false, reason: "invalidShift" });
    }
  }
  for (const [analyze, maximum] of [[learning.traceSource, 200], [learning.frequencyAnalysis, 20]]) {
    const invalidLimits = [null, false, "0", -1, maximum + 1, 1.5, NaN, Infinity, {}, new Number(0), Symbol("0"), 0n];
    for (const limit of invalidLimits) {
      assert.deepEqual(analyze("text", 0, limit), { ok: false, reason: "invalidLimit" });
    }
    assert.equal(analyze("", 94, 0).ok, true);
    assert.equal(analyze("text", 94, maximum).ok, true);
  }
});

test("prototype-related text remains ordinary data and does not mutate result prototypes", () => {
  const source = "__proto__ constructor prototype toString";
  const before = Object.getOwnPropertyDescriptors(Object.prototype);
  const inspected = learning.inspectSnippet(core.buildSnippet(source, 94));
  assert.equal(inspected.ok, true);
  assert.equal(inspected.source, source);
  const frequency = learning.frequencyAnalysis(source, 94);
  assert.equal(frequency.totalCount, source.length);
  assert.equal(frequency.rows.reduce((sum, row) => sum + row.count, 0) + frequency.otherCount, source.length);
  assert.equal(Object.getPrototypeOf(inspected), Object.prototype);
  assert.equal(Object.getPrototypeOf(frequency), Object.prototype);
  assert.deepEqual(Object.getOwnPropertyDescriptors(Object.prototype), before);
});

test("inspection size limits are checked before transfer-newline normalization", () => {
  const maximum = learning.MAX_INSPECT_CODE_UNITS;
  const source = "A".repeat(maximum - core.buildSnippet("", 0).length);
  const atLimit = core.buildSnippet(source, 0);
  assert.deepEqual(learning.inspectSnippet(atLimit + "\n"), { ok: false, reason: "tooLarge" });
  assert.deepEqual(learning.inspectSnippet(atLimit.replace(/\n/g, "\r\n")), { ok: false, reason: "tooLarge" });
  assert.deepEqual(learning.decodePayloadLiteral("A".repeat(maximum + 1)), { ok: false, reason: "tooLarge" });
});
