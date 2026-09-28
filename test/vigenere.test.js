"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const v = require("../js/vigenere-core.js");
const caesar = require("../js/obfuscator-core.js");
const expected = require("./fixtures/vigenere-expect.json");
const ui = require("../js/vigenere-ui.js");
const messages = require("../js/i18n.js").messages;

test("independent Vigenere vectors remain byte-for-byte fixed", () => {
  const bytes = fs.readFileSync(path.join(__dirname, "fixtures/vigenere-expect.json"));
  assert.equal(require("node:crypto").createHash("sha256").update(bytes).digest("hex"),
    "02dd8554751e8590a443f3e1109fc64181762b015b1feed0fe1c43e2f67af431");
});

test("all Vigenere static labels have nonempty bilingual messages and safe rendering", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const labels = [...html.matchAll(/data-vig="([^"]+)"/g)].map(match => match[1]);
  assert.ok(labels.length >= 30);
  for (const language of ["ja", "en"]) {
    for (const key of labels) assert.ok(messages[language][key]?.trim(), language + ": " + key);
  }
  const source = fs.readFileSync(path.join(__dirname, "../js/vigenere-ui.js"), "utf8");
  assert.doesNotMatch(source, /innerHTML|outerHTML|srcdoc|document\.write|\beval\s*\(|new\s+Function/);
});

function uiHarness() {
  const elements = new Map();
  class Element {
    constructor() { this.value = ""; this.textContent = ""; this.dataset = {}; this.listeners = {}; this.children = []; }
    addEventListener(event, callback) { this.listeners[event] = callback; }
    setAttribute(name, value) { this[name] = value; }
    replaceChildren(...children) { this.children = children; }
    appendChild(child) { this.children.push(child); }
    focus() { this.focused = true; }
    select() { this.selected = true; }
    emit(event = "click") { return this.listeners[event](); }
  }
  const el = name => {
    if (!elements.has(name)) elements.set(name, new Element());
    return elements.get(name);
  };
  let language = "ja";
  const copied = [], downloads = [], runs = [];
  let clipboard = async text => { copied.push(text); };
  let resets = 0;
  class Runner {
    static supported = true;
    constructor(options) { this.options = options; this.running = false; }
    reset() { resets++; this.running = false; this.options.onState("idle"); }
    run(text) { this.running = true; runs.push(text); this.options.onState("running"); }
  }
  el("key").value = "LEMON";
  const controller = ui.create({
    document: {
      getElementById: id => el(id.slice(4)),
      querySelectorAll: () => [],
      createElement: () => new Element(),
    },
    t: (key, params = {}) => messages[language][key].replace(/\{([a-zA-Z]+)\}/g, (_, name) => params[name] ?? ""),
    getLanguage: () => language, Runner,
    writeClipboard: text => clipboard(text), download: text => downloads.push(text),
  });
  return { el, controller, copied, downloads, runs, resetCount: () => resets,
    setClipboard: fn => { clipboard = fn; },
    language: value => { language = value; controller.refreshLanguage(); } };
}

test("Vigenere matches independently calculated fixed vectors and restores without execution", () => {
  assert.equal(expected.length, 5);
  for (const { source, key, payload } of expected) {
    assert.equal(v.transform(source, key), payload);
    assert.equal(v.transform(payload, key, true), source);
    const recovered = v.inspectSnippet(v.buildSnippet(source, key));
    assert.equal(recovered.ok, true);
    assert.equal(recovered.source, source);
    assert.equal(recovered.key, key);
  }
});

test("Vigenere validates the raw alphabet before uppercase conversion", () => {
  for (const key of [null, undefined, 3, "", " ", "LE MON", "123", "KEY!", "ＫＥＹ", "ſ", "ß", "A".repeat(129)]) {
    assert.equal(v.parseKey(key).ok, false, String(key));
  }
  assert.equal(v.parseKey("  lemon\n").value, "LEMON");
  assert.equal(v.parseKey("z".repeat(128)).value, "Z".repeat(128));
  assert.equal(v.parseKey("aAa").noop, true);
  assert.equal(v.parseKey("AB").noop, false);
  assert.throws(() => v.buildSnippet("test", "!"), TypeError);
});

test("all 95 printable characters and 26 single-letter keys agree with Caesar", () => {
  const alphabet = Array.from({ length: 95 }, (_, i) => String.fromCharCode(i + 32)).join("");
  for (let shift = 0; shift < 26; shift++) {
    const key = String.fromCharCode(65 + shift);
    assert.equal(v.transform(alphabet, key), caesar.caesarShift(alphabet, shift));
    assert.equal(v.transform(v.transform(alphabet, key), key, true), alphabet);
  }
  assert.equal(v.transform(" ~ABC", "D"), caesar.caesarShift(" ~ABC", 3));
});

test("nonprintable and non-ASCII code points neither change nor consume a key position", () => {
  const source = "A\r\n\t\0日本😀\uD800\uDC00\uD800\u2028\u2029B";
  const shifted = v.transform(source, "BC");
  assert.equal(shifted, "B" + source.slice(1, -1) + "D");
  assert.equal(v.inspectSnippet(v.buildSnippet(source, "BC")).source, source);
  const rows = v.trace(source, "BC");
  assert.equal(rows.at(-1).keyIndex, 1);
  assert.ok(rows.slice(1, -1).every(row => row.keyIndex === null && row.input === row.output));
  assert.equal(v.trace("x".repeat(201), "KEY").length, 200);
});

test("Vigenere inspector accepts only its exact envelope and canonical escapes", () => {
  const snippet = v.buildSnippet("</script>\n", "KEY");
  for (const variant of [snippet, snippet + "\n", snippet.replace(/\n/g, "\r\n")]) {
    assert.equal(v.inspectSnippet(variant).source, "</script>\n");
  }
  for (const bad of ["", " " + snippet, snippet + "\n\n", snippet + "alert(1)", "\uFEFF" + snippet,
    snippet.replace('"KEY";', '"key";'), snippet.replace("(0, eval)(dec)", "eval(dec)"),
    snippet.replace("c>=32", "c>31"), snippet.replace("\n", "\r\n"), snippet.replace("\n", "\r"),
    caesar.buildSnippet("test", 3)]) assert.equal(v.inspectSnippet(bad).ok, false);
  const danger = v.buildSnippet("</script>", "A");
  assert.ok(!danger.split("\n")[2].includes("<"));
  assert.equal(v.inspectSnippet(danger.replace("\\x3C", "<")).ok, false);
});

test("generated decoder restores exact strings; VM execution is limited to trusted fixtures", () => {
  for (const { source, key } of expected) {
    const context = { captured: null };
    context.eval = value => { context.captured = value; };
    vm.runInNewContext(v.buildSnippet(source, key), context, { timeout: 1000 });
    assert.equal(context.captured, source);
  }
  const context = {};
  vm.runInNewContext(v.buildSnippet("globalThis.result = 6 * 7;", "LEMON"), context, { timeout: 1000 });
  assert.equal(context.result, 42);
});

test("Vigenere enforces input/output limits and preserves empty sources", () => {
  assert.equal(v.transform("A".repeat(v.LIMIT), "B").length, v.LIMIT);
  assert.throws(() => v.transform("A".repeat(v.LIMIT + 1), "A"), RangeError);
  assert.throws(() => v.buildSnippet("A".repeat(v.LIMIT), "A"), RangeError);
  assert.equal(v.inspectSnippet("x".repeat(v.LIMIT + 1)).reason, "tooLarge");
  assert.equal(v.inspectSnippet(v.buildSnippet("", "ABC")).source, "");
});

test("Vigenere core has no runtime dynamic execution or browser side effects", () => {
  const source = fs.readFileSync(path.join(__dirname, "../js/vigenere-core.js"), "utf8");
  assert.doesNotMatch(source, /\b(?:window|document|localStorage|fetch|XMLHttpRequest|Function)\b/);
  assert.equal((source.match(/eval/g) || []).length, 2, "only fixed emitted and matched envelope lines");
});

test("Vigenere UI invalidates every source mutation and keeps sample selection separate", () => {
  const h = uiHarness();
  for (const action of ["source", "key", "load", "clear", "reset"]) {
    h.el("source").value = "A😀B";
    h.el("key").value = "BC";
    h.el("generate").emit();
    assert.equal(h.el("output").value, v.buildSnippet("A😀B", "BC"));
    assert.equal(h.el("trace").children.length, 3);
    h.el("sample").value = "unicode";
    assert.equal(h.el("copy").disabled, false);
    const before = h.resetCount();
    h.el(action).emit(["source", "key"].includes(action) ? "input" : "click");
    assert.equal(h.el("output").value, "");
    assert.equal(h.el("trace").children.length, 0);
    assert.equal(h.el("sizes").textContent, "");
    assert.equal(h.el("copy").disabled, true);
    assert.equal(h.el("run").disabled, true);
    assert.ok(h.resetCount() > before);
  }
  assert.equal(h.runs.length, 0, "selection, load, generation and reset never execute");
});

test("Vigenere UI keeps inspector snapshots independent and clears failed or edited recovery", () => {
  const h = uiHarness();
  h.el("source").value = "A\r\nB😀\u202E";
  h.el("generate").emit();
  h.el("inspect-load").emit();
  h.el("inspect").emit();
  const original = h.el("restored").textContent;
  assert.equal(original, "A\r\nB😀\u202E");
  assert.equal(h.el("inspect-status").dataset.state, "equal");
  h.el("source").value = "changed";
  h.el("source").emit("input");
  h.language("en");
  assert.equal(h.el("restored").textContent, original);
  assert.equal(h.el("inspect-status").dataset.state, "equal");
  h.el("inspect-input").emit("input");
  assert.equal(h.el("restored").textContent, "");
  h.el("inspect").emit();
  assert.equal(h.el("inspect-status").dataset.state, "accepted");
  h.el("inspect-input").value += "\n// trailing code";
  h.el("inspect").emit();
  assert.equal(h.el("restored").textContent, "");
  assert.equal(h.el("inspect-status").dataset.state, "invalid");
  h.el("inspect-clear").emit();
  assert.equal(h.el("inspect-input").value, "");
  assert.equal(h.runs.length, 0);
});

test("Vigenere UI guards pending clipboard results and copies/downloads only fresh output", async () => {
  const h = uiHarness();
  h.el("generate").emit();
  await h.el("copy").emit();
  h.el("download").emit();
  assert.equal(h.copied[0], h.el("output").value);
  assert.equal(h.downloads[0], h.copied[0]);
  for (const succeeds of [true, false]) {
    let resolve, reject;
    h.setClipboard(() => new Promise((yes, no) => { resolve = yes; reject = no; }));
    h.el("generate").emit();
    const pending = h.el("copy").emit();
    h.language(succeeds ? "en" : "ja");
    const status = h.el("status").textContent;
    if (succeeds) resolve(); else reject(new Error("test denial"));
    await pending;
    assert.equal(h.el("status").textContent, status);
    assert.equal(h.el("output").value, "");
  }
  await h.el("copy").emit();
  h.el("download").emit();
  assert.equal(h.copied.length, 1);
  assert.equal(h.downloads.length, 1);
});

test("Vigenere UI caps traces, rejects expanded output and destroys active execution", () => {
  const h = uiHarness();
  h.el("source").value = "A".repeat(250);
  h.el("generate").emit();
  assert.equal(h.el("trace").children.length, 200);
  h.el("run").emit();
  assert.equal(h.runs.length, 1);
  assert.equal(h.el("run").disabled, true);
  h.controller.stop();
  assert.equal(h.el("run").disabled, false);
  h.el("source").value = "A".repeat(v.LIMIT);
  h.el("generate").emit();
  assert.equal(h.el("output").value, "");
  assert.equal(h.el("trace").children.length, 0);
  assert.equal(h.el("copy").disabled, true);
  h.el("source").value += "A";
  h.el("source").emit("input");
  assert.equal(h.el("generate").disabled, true);
});
