"use strict";

// Execute only the checked-in, benign teaching samples in disposable contexts.
// Never use this test harness to evaluate inspector input from a user.
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const samples = require("../js/samples.js");
const core = require("../js/obfuscator-core.js");
const i18n = require("../js/i18n.js");
const fs = require("node:fs");
const crypto = require("node:crypto");

function executeFixture(source) {
  const consoleCalls = [];
  const domAppend = [];
  const sampleConsole = Object.fromEntries(["log", "info", "warn", "error", "debug"]
    .map(method => [method, (...args) => consoleCalls.push({ method, args })]));
  const context = vm.createContext({
    console: sampleConsole,
    document: {
      createElement(tag) { return { tag, textContent: "" }; },
      body: { appendChild(element) { domAppend.push({ tag: element.tag, text: element.textContent }); } },
    },
  });
  new vm.Script(source).runInContext(context, { timeout: 1000 });
  return { consoleCalls, domAppend };
}

test("six teaching IDs and loading policy are fixed; basic preserves both existing samples", () => {
  assert.deepEqual(samples.samples.map(sample => sample.id),
    ["basic", "ascii-wrap", "unicode", "escapes", "console", "scope"]);
  assert.equal(samples.loadingPolicy.replaceSourceOnly, true);
  assert.equal(samples.loadingPolicy.preserveCurrentShift, true);
  assert.equal(samples.loadingPolicy.recommendedShiftIsInformationalOnly, true);
  assert.equal(samples.loadingPolicy.executeOnLoad, false);
  for (const language of ["ja", "en"]) {
    assert.equal(samples.samples[0][language].source, i18n.messages[language].sample);
    for (const sample of samples.samples) {
      for (const field of ["source", "name", "description"]) {
        assert.equal(typeof sample[language][field], "string");
      }
      assert.deepEqual(Object.keys(sample.ja).sort(), Object.keys(sample.en).sort());
    }
  }
});

test("all twelve benign source fixtures and generated snippets have the declared effects", () => {
  let executions = 0;
  for (const sample of samples.samples) {
    for (const language of ["ja", "en"]) {
      const fixture = sample[language];
      const expected = { consoleCalls: fixture.expected.consoleCalls, domAppend: fixture.expected.domAppend };
      assert.deepEqual(executeFixture(fixture.source), expected, `${sample.id}/${language}: source`);
      assert.deepEqual(executeFixture(core.buildSnippet(fixture.source, sample.recommendedShift)),
        expected, `${sample.id}/${language}: generated`);
      executions += 2;
    }
  }
  assert.equal(executions, 24);
});

test("boundary, Unicode, and actual source newline observations match fixture data", () => {
  const byId = Object.fromEntries(samples.samples.map(sample => [sample.id, sample]));
  const probe = byId["ascii-wrap"].caesarProbe;
  assert.equal(core.caesarShift(probe.input, probe.shift), probe.shifted);
  assert.deepEqual([...probe.input].map(character => character.charCodeAt(0)), probe.inputCodeUnits);
  assert.deepEqual([...probe.shifted].map(character => character.charCodeAt(0)), probe.shiftedCodeUnits);
  assert.deepEqual([...byId.unicode.ja.expected.consoleCalls[0].args[0]].map(character => character.codePointAt(0)),
    byId.unicode.sharedTestData.stringCodePoints);
  assert.equal(byId.unicode.ja.source, byId.unicode.en.source);
  for (const language of ["ja", "en"]) {
    const source = byId.escapes[language].source;
    assert.equal([...source].filter(character => character === "\n").length, byId.escapes.sourceLineBreaks.lfCount);
    assert.equal([...source].filter(character => character === "\r").length, byId.escapes.sourceLineBreaks.crCount);
  }
});

test("every sample field and loading-policy value retains the approved reference data", () => {
  // Digest of the supplied reference object, excluding its reference-only purpose label.
  const digest = crypto.createHash("sha256").update(JSON.stringify(samples)).digest("hex");
  assert.equal(digest, "c5067864cf8012ed7e7c1eb03729a605442a6898cfce3c3c7741d79383528cb9");
  assert.equal(samples.schemaVersion, 1);
  assert.equal(samples.samples.length, 6);
});

test("localized lookup returns the exact sample fields and immutable teaching data", () => {
  function assertFrozen(value) {
    if (!value || typeof value !== "object") return;
    assert.equal(Object.isFrozen(value), true);
    for (const child of Object.values(value)) assertFrozen(child);
  }
  assertFrozen(samples);
  for (const sample of samples.samples) {
    for (const language of ["ja", "en"]) {
      const actual = samples.get(sample.id, language);
      assert.deepEqual(actual, { id: sample.id, recommendedShift: sample.recommendedShift, ...sample[language] });
      assertFrozen(actual);
      assert.throws(() => { actual.source = "changed"; }, TypeError);
    }
  }
  assert.throws(() => samples.samples.push({}), TypeError);
  assert.throws(() => { samples.samples[0].ja.expected.domAppend[0].text = "changed"; }, TypeError);
});

test("lookup rejects unknown IDs, languages and non-string values without coercion", () => {
  const trapped = new Proxy({}, { get() { throw new Error("Unexpected coercion"); } });
  for (const id of ["missing", "__proto__", "constructor", "", null, undefined, 3, {}, trapped, new String("basic")]) {
    assert.equal(samples.get(id, "ja"), null);
  }
  for (const language of ["", "JA", "ja-JP", "fr", null, undefined, {}, trapped, new String("ja")]) {
    assert.equal(samples.get("basic", language), null);
  }
});

test("classic-script loading and lookup never run teaching code or use DOM, storage or network", () => {
  let effects = 0;
  const blocked = new Proxy({}, {
    get() {
      effects++;
      throw new Error("Unexpected side effect");
    },
  });
  const context = vm.createContext({
    document: blocked, console: blocked, localStorage: blocked, sessionStorage: blocked, location: blocked,
    fetch() { effects++; throw new Error("Unexpected network request"); },
  }, { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext(fs.readFileSync(require.resolve("../js/samples.js"), "utf8"), context, { timeout: 1000 });
  assert.equal(context.Samples.samples.length, 6);
  for (const sample of samples.samples) {
    for (const language of ["ja", "en"]) {
      assert.equal(context.Samples.get(sample.id, language).source, sample[language].source);
    }
  }
  assert.equal(effects, 0);
});
