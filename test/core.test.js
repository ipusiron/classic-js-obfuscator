"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const core = require("../js/obfuscator-core.js");
const expected = require("./fixtures/expect.json");

test("known Caesar answers preserve the 95-character alphabet", () => {
  const cases = [
    ["Hello", 3, "hello_3"],
    ["ABC ~", 94, "abc_94"],
    [" !~", 47, "sp_47"],
    ["Hello World", 47, "hw_47"],
    ["// Sample:", 3, "sample_en_3"],
    ["// サンプル", 3, "sample_ja_3"],
    ["9,p`ofmq;", 3, "script_close"],
  ];
  for (const [input, shift, name] of cases) {
    assert.equal(core.caesarShift(input, shift), expected.known[name], name);
  }
  assert.notEqual(core.caesarShift("Hello World", 47), expected.known.rot47_hw);
});

test("all shifts round-trip printable ASCII, control characters and Unicode", () => {
  const printable = Array.from({ length: 95 }, (_, index) => String.fromCharCode(32 + index)).join("");
  const controls = Array.from({ length: 32 }, (_, index) => String.fromCharCode(index)).join("");
  const input = printable + controls + "\x7f\u2028\u2029日本語😀";
  for (let shift = 0; shift <= 94; shift++) {
    assert.equal(core.caesarShift(core.caesarShift(input, shift), -shift), input, `shift ${shift}`);
  }
  assert.equal(core.caesarShift(input, 95), input);
  assert.equal(core.caesarShift(input, -95), input);
});

test("reference escape cases match exactly", () => {
  const cases = {
    bs: core.BS,
    dq: '"',
    lt: "<",
    tab: "\t",
    nul: "\x00",
    del: "\x7f",
    ls: "\u2028",
    ja: "日本",
  };
  for (const [name, input] of Object.entries(cases)) {
    assert.equal(core.escapeForJsString(input), expected.escape[name], name);
  }
});

test("escaping every control character produces a valid reversible string literal", () => {
  const controls = Array.from({ length: 32 }, (_, index) => String.fromCharCode(index)).join("");
  const input = controls + "\x7f\u2028\u2029<>\"\\日本😀";
  const escaped = core.escapeForJsString(input);
  assert.doesNotMatch(escaped, /[\x00-\x1f\x7f\u2028\u2029<]/u);
  assert.equal(vm.runInNewContext('"' + escaped + '"', {}, { timeout: 1000 }), input);
});

test("shift validation distinguishes empty, invalid, out-of-range and no-op keys", () => {
  for (const [input, answer] of Object.entries(expected.parse)) {
    assert.deepEqual(core.parseShift(JSON.parse(input)), answer, input);
  }
  assert.deepEqual(core.parseShift("9".repeat(400)), { ok: false, reason: "outOfRange" });
});

test("sample and empty statistics match reference code-point counts", () => {
  assert.deepEqual(core.stats(expected.sample, core.buildSnippet(expected.sample, 3)), expected.sample_stats_3);
  assert.deepEqual(core.stats("", core.buildSnippet("", 3)), expected.empty_stats);
  assert.deepEqual(core.stats("A😀\n", "😀A"), {
    length: 3, shifted: 1, passed: 2, snippetLength: 2, ratio: 66.7,
  });
});

test("a bijective shift preserves the sample entropy", () => {
  assert.equal(core.entropy(expected.sample).toFixed(4), expected.sample_entropy[0]);
  assert.equal(core.entropy(core.caesarShift(expected.sample, 3)).toFixed(4), expected.sample_entropy[1]);
  assert.equal(core.entropy(""), 0);
});

test("the core also loads as a classic browser script without DOM access", () => {
  const source = fs.readFileSync(path.join(__dirname, "../js/obfuscator-core.js"), "utf8");
  const context = vm.createContext({});
  vm.runInContext(source, context, { timeout: 1000 });
  assert.equal(context.ObfuscatorCore.buildSnippet(expected.sample, 3), expected.sample_snippet_3);
  assert.equal(context.ObfuscatorCore.caesarShift("Hello", 3), expected.known.hello_3);
});
