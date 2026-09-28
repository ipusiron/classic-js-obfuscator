"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const core = require("../js/obfuscator-core.js");
const expected = require("./fixtures/expect.json");

function run(snippet, globals = {}) {
  const context = vm.createContext(globals);
  vm.runInContext(snippet, context, { timeout: 1000 });
  return context;
}

test("sample output and embedded decoder remain byte-for-byte compatible", () => {
  assert.equal(core.buildSnippet(expected.sample, 3), expected.sample_snippet_3);
  assert.equal(core.caesarShift(expected.sample, 3), expected.sample_payload_3);
  assert.equal(core.escapeForJsString(expected.sample_payload_3), expected.sample_payload_3_escaped);
  assert.equal(expected.sample_snippet_3.split("\n")[1], "  const d = " + core.DECRYPT_SRC + ";");
});

test("the benign sample produces exactly the reference log and element", () => {
  const logs = [];
  const appended = [];
  run(core.buildSnippet(expected.sample, 3), {
    console: { log: (...args) => logs.push(args.join(" ")) },
    document: {
      createElement: (tag) => ({ tag, textContent: "" }),
      body: { appendChild: (node) => appended.push([node.tag, node.textContent]) },
    },
  });
  assert.deepEqual({ logs, appended }, expected.sample_run);
});

test("all shifts execute reversible string data without raw payload angle brackets", () => {
  const printable = Array.from({ length: 95 }, (_, index) => String.fromCharCode(32 + index)).join("");
  const controls = Array.from({ length: 32 }, (_, index) => String.fromCharCode(index)).join("");
  const input = printable + controls + "\x7f\u2028\u2029日本語😀";
  const failures = [];
  for (let shift = 0; shift <= 94; shift++) {
    const snippet = core.buildSnippet("globalThis.result = " + JSON.stringify(input) + ";", shift);
    if (run(snippet).result !== input) failures.push(shift);
    // The unchanged decoder contains comparison operators. Only the payload
    // string must be free of raw '<'; the whole snippet must lack HTML delimiters.
    assert.ok(!snippet.split("\n")[2].includes("<"), `payload shift ${shift}`);
    assert.doesNotMatch(snippet, /<\/script|<!--/i);
  }
  assert.deepEqual(failures, expected.roundtrip_fail);
});

test("reference HTML delimiter cases stay escaped as inert string data", () => {
  const closeSnippet = core.buildSnippet("var s = '9,p`ofmq;';", 3);
  assert.equal(/<\/script/i.test(closeSnippet), expected.script_close.snippet_has_close);
  assert.equal(closeSnippet.split("\n")[2], expected.script_close.payload_line);
  const commentSnippet = core.buildSnippet("var s = '9" + String.fromCharCode(0x1e) + "**';", 3);
  assert.equal(commentSnippet.includes("<!--"), expected.comment_open.snippet_has_comment_open);
  assert.equal(commentSnippet.split("\n")[2], expected.comment_open.payload_line);
});

test("indirect evaluation keeps top-level function and var scope without exposing wrapper locals", () => {
  const code = "function greet(){return 1}\nvar counter = 1;\nconst K = 2;\n" +
    "globalThis.seen = [typeof d, typeof enc, typeof sft, typeof dec];";
  const context = run(core.buildSnippet(code, 3));
  const after = vm.runInContext("[typeof greet, typeof counter, typeof K]", context, { timeout: 1000 });
  assert.deepEqual(Array.from(after), expected.scope.after);
  assert.deepEqual(Array.from(context.seen), expected.scope.seen);
});

test("strict code retains the documented eval declaration scope", () => {
  const code = '"use strict";\nvar x = 1;';
  const plain = run(code);
  const snippet = run(core.buildSnippet(code, 3));
  assert.equal(vm.runInContext("typeof x", plain, { timeout: 1000 }), expected.scope_use_strict.plain);
  assert.equal(vm.runInContext("typeof x", snippet, { timeout: 1000 }), expected.scope_use_strict.snippet);
});
