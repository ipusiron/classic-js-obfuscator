"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const core = require("../js/obfuscator-core.js");
const i18n = require("../js/i18n.js");
const samples = require("../js/samples.js");
const editor = require("../js/editor-state.js");
const learning = require("../js/learning-ui.js");
const source = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function createUI({ clipboard, fallbackThrows = false } = {}) {
  const nodes = new Map();
  const windowListeners = new Map();
  const clipboardValues = [];
  const fallbackValues = [];
  let language = "ja";
  let created = 0;
  let executions = 0;
  const document = {
    activeElement: null,
    addEventListener() {},
    getElementById(id) { return node(id); },
    createElement(tag) {
      assert.ok(!["script", "iframe"].includes(tag.toLowerCase()), "learning UI must not create executable elements");
      const element = node(`created-${created++}`);
      element.tagName = tag.toUpperCase();
      return element;
    },
    execCommand(command) {
      assert.equal(command, "copy");
      if (fallbackThrows) throw new Error("Copy denied");
      fallbackValues.push(document.activeElement.value);
      return true;
    }
  };
  function node(id) {
    if (!nodes.has(id)) {
      const classes = new Set();
      const listeners = new Map();
      let text = "";
      nodes.set(id, {
        id,
        value: id === "key" ? "3" : "",
        get textContent() { return text + this.children.map(child => child.textContent).join(""); },
        set textContent(value) { text = String(value); this.children = []; },
        set innerHTML(_value) { throw new Error("Learning UI must use textContent, not HTML interpretation"); },
        disabled: false,
        listeners,
        attributes: {},
        dataset: {},
        hidden: false,
        className: "",
        children: [],
        replaceChildren(...children) { text = ""; this.children = children; },
        appendChild(child) { this.children.push(child); return child; },
        append(...children) { this.children.push(...children); },
        classList: {
          add(name) { classes.add(name); },
          remove(name) { classes.delete(name); },
          contains(name) { return classes.has(name); },
          toggle(name, enabled) {
            if (enabled) classes.add(name);
            else classes.delete(name);
          }
        },
        setAttribute(name, value) { this.attributes[name] = value; },
        getAttribute(name) { return this.attributes[name] ?? null; },
        addEventListener(name, handler) { listeners.set(name, handler); },
        focus() { document.activeElement = this; },
        select() {}
      });
    }
    return nodes.get(id);
  }
  node("normal-view").classList.add("active");
  const window = {
    location: { hash: "" },
    addEventListener(name, handler) { windowListeners.set(name, handler); }
  };
  class SandboxRunner {
    static get supported() { return true; }
    reset() {}
    run() { executions++; }
  }
  const context = {
    ObfuscatorCore: core,
    ObfuscatorI18n: {
      messages: i18n.messages,
      get language() { return language; },
      setLanguage(next) { changeLanguage(next); },
      t(key, params = {}) {
        return i18n.messages[language][key].replace(/\{([a-zA-Z]+)\}/g, (_, name) => params[name] ?? "");
      }
    },
    Samples: samples,
    EditorState: editor,
    LearningUI: learning,
    QuizUI: require("../js/quiz-ui.js"),
    ShareUI: require("../js/share-ui.js"),
    SandboxRunner,
    document,
    window,
    navigator: {
      clipboard: {
        writeText(value) {
          clipboardValues.push(value);
          return clipboard || Promise.reject(new Error("Clipboard API denied"));
        }
      }
    },
    setTimeout() {}
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  context.init();
  context.initViewMode();
  function click(id) { return node(id).listeners.get("click")(); }
  function generate() {
    click("btn-generate");
    return node("outputCode").value;
  }
  function invalidate(method) {
    if (method === "language") windowListeners.get("languagechange")();
    else {
      node("key").value = "4";
      node("key").listeners.get("input")();
    }
  }
  function input(id, value) {
    node(id).value = value;
    node(id).listeners.get("input")();
  }
  function changeLanguage(next) {
    language = next;
    windowListeners.get("languagechange")();
  }
  function hash(value, dispatch = true) {
    window.location.hash = value;
    if (dispatch) windowListeners.get("hashchange")();
  }
  return { node, click, input, hash, changeLanguage, generate, invalidate, clipboardValues, fallbackValues, runCount: () => executions };
}

for (const mutation of ["key", "language"]) {
  for (const resolution of ["reject", "resolve"]) {
    test(`pending clipboard ${resolution} after ${mutation} change does not fall back or show stale success`, async () => {
      const pending = deferred();
      const ui = createUI({ clipboard: pending.promise });
      const snippet = ui.generate();
      assert.ok(snippet.length > 0);
      const operation = ui.click("btn-copy");
      assert.deepEqual(ui.clipboardValues, [snippet]);
      ui.invalidate(mutation);
      assert.equal(ui.node("outputCode").value, "");
      assert.equal(ui.node("outputCodeCompare").value, "");
      for (const id of ["btn-copy", "btn-download", "btn-run"]) assert.equal(ui.node(id).disabled, true);
      if (resolution === "reject") pending.reject(new Error("Late permission denial"));
      else pending.resolve();
      await operation;
      assert.deepEqual(ui.fallbackValues, []);
      assert.equal(ui.node("toast").classList.contains("show"), false);
      assert.equal(ui.node("toast").textContent, "");
    });
  }
}

test("shared settings remain pending, apply atomically and restore pre-apply raw input", () => {
  const ui = createUI();
  ui.input("inputCode", "custom before sharing");
  ui.input("key", "invalid");
  ui.hash("#cjo=v1&sample=unicode&key=94&lang=en&view=compare");
  assert.equal(ui.node("share-pending").hidden, false);
  assert.equal(ui.node("inputCode").value, "custom before sharing");
  assert.equal(ui.node("key").value, "invalid");
  ui.click("btn-share-apply");
  assert.equal(ui.node("inputCode").value, samples.get("unicode", "en").source);
  assert.equal(ui.node("inputCodeCompare").value, ui.node("inputCode").value);
  assert.equal(ui.node("key").value, "94");
  assert.equal(ui.node("btn-compare-view").attributes["aria-pressed"], "true");
  assert.equal(ui.node("share-pending").hidden, true);
  ui.generate();
  ui.hash("#cjo=v1&sample=unicode&key=94&lang=en&view=compare");
  ui.click("btn-share-apply");
  assert.equal(ui.node("outputCode").value, "");
  ui.click("btn-restore-input");
  assert.equal(ui.node("inputCode").value, "custom before sharing");
  assert.equal(ui.node("key").value, "invalid");
  assert.equal(ui.node("btn-compare-view").attributes["aria-pressed"], "true");
  assert.equal(ui.node("btn-generate").disabled, true);
  assert.equal(ui.runCount(), 0);
});

test("invalid, dismissed and superseded fragments cannot silently apply settings", () => {
  const ui = createUI();
  const before = ui.node("inputCode").value;
  const valid = "#cjo=v1&sample=unicode&key=3&lang=en&view=compare";
  ui.hash(valid);
  ui.click("btn-share-dismiss");
  ui.click("btn-share-apply");
  assert.equal(ui.node("inputCode").value, before);
  ui.hash(valid);
  ui.hash(valid + "&code=NEVER_DISPLAY", false);
  ui.click("btn-share-apply");
  assert.equal(ui.node("share-pending").hidden, true);
  assert.equal(ui.node("share-error").textContent, i18n.messages.ja.shareInvalid);
  assert.doesNotMatch(ui.node("share-error").textContent, /NEVER_DISPLAY/);
  assert.equal(ui.node("inputCode").value, before);
  assert.equal(ui.node("btn-restore-input").disabled, true);
  ui.hash("#another-anchor");
  assert.equal(ui.node("share-error").textContent, "");
});

for (const resolution of ["resolve", "reject"]) {
  test(`shared URL copy ${resolution} is ignored after settings change`, async () => {
    const pending = deferred();
    const ui = createUI({ clipboard: pending.promise });
    ui.input("inputCode", "NEVER_SHARE");
    ui.node("sample-select").value = "unicode";
    ui.input("key", "003");
    ui.click("btn-share-create");
    const url = ui.node("share-url").value;
    assert.equal(url, "https://ipusiron.github.io/classic-js-obfuscator/#cjo=v1&sample=unicode&key=3&lang=ja&view=normal");
    const operation = ui.click("btn-share-copy");
    ui.click("btn-compare-view");
    assert.equal(ui.node("share-url").value, "");
    if (resolution === "resolve") pending.resolve();
    else pending.reject(new Error("Denied"));
    await operation;
    assert.equal(ui.node("share-status").textContent, "");
    assert.equal(ui.node("btn-share-copy").disabled, true);
    assert.deepEqual(ui.clipboardValues, [url]);
    assert.deepEqual(ui.fallbackValues, []);
  });
}

test("shared URL copy rejection selects only the code-free URL for manual copying", async () => {
  const ui = createUI();
  ui.click("btn-share-create");
  await ui.click("btn-share-copy");
  assert.equal(ui.node("share-status").textContent, i18n.messages.ja.shareCopyManual);
  assert.equal(ui.node("inputCode").value, samples.get("basic", "ja").source);
  assert.equal(ui.runCount(), 0);
});

test("quiz preserves selected and graded answers through navigation, language and editor operations", () => {
  const ui = createUI();
  ui.node("quiz-choice-b").checked = true;
  ui.node("quiz-choice-b").listeners.get("change")();
  ui.click("btn-quiz-next");
  ui.changeLanguage("en");
  ui.click("btn-quiz-prev");
  assert.equal(ui.node("quiz-choice-b").checked, true);
  ui.click("btn-quiz-grade");
  ui.click("btn-quiz-grade");
  assert.equal(ui.node("quiz-progress").attributes["data-correct"], "1");
  assert.equal(ui.node("quiz-result").textContent, i18n.messages.en.quizCorrect);
  ui.node("quiz-choice-a").checked = true;
  ui.node("quiz-choice-a").listeners.get("change")();
  assert.equal(ui.node("quiz-choice-b").checked, true);
  assert.equal(ui.node("quiz-choice-a").checked, false);
  ui.input("inputCode", "custom source");
  ui.input("key", "003");
  ui.generate();
  ui.click("btn-quiz-load");
  assert.equal(ui.node("key").value, "003");
  assert.equal(ui.node("outputCode").value, "");
  assert.equal(ui.node("inputCode").value, samples.get("basic", "en").source);
  assert.equal(ui.node("quiz-progress").attributes["data-correct"], "1");
  ui.click("btn-restore-input");
  assert.equal(ui.node("inputCode").value, "custom source");
  ui.click("btn-quiz-reset");
  assert.equal(ui.node("quiz-progress").attributes["data-answered"], "0");
  assert.equal(ui.node("quiz-explanation").hidden, true);
  assert.equal(ui.node("btn-quiz-grade").disabled, true);
  assert.equal(ui.node("inputCode").value, "custom source");
  assert.equal(ui.runCount(), 0);
});

test("quiz UI visits and grades all twelve fixed questions without executing code", () => {
  const ui = createUI();
  const questions = require("../js/quiz-data.js");
  ui.click("btn-quiz-grade");
  for (const [index, question] of questions.entries()) {
    assert.equal(ui.node("quiz-panel").attributes["data-question"], question.id);
    const choice = ui.node("quiz-choice-" + question.answerId);
    choice.checked = true;
    choice.listeners.get("change")();
    ui.click("btn-quiz-grade");
    assert.equal(ui.node("quiz-progress").attributes["data-correct"], String(index + 1));
    if (index < questions.length - 1) ui.click("btn-quiz-next");
  }
  assert.equal(ui.node("btn-quiz-next").disabled, true);
  ui.click("btn-quiz-next");
  assert.equal(ui.node("quiz-progress").attributes["data-answered"], "12");
  assert.equal(ui.runCount(), 0);
});

test("clipboard rejection with unchanged output copies that output using the fallback", async () => {
  const ui = createUI();
  const snippet = ui.generate();
  await ui.click("btn-copy");
  assert.deepEqual(ui.clipboardValues, [snippet]);
  assert.deepEqual(ui.fallbackValues, [snippet]);
  assert.equal(ui.node("toast").textContent, i18n.t("copySuccess"));
  assert.equal(ui.node("toast").classList.contains("error"), false);
});

test("clipboard rejection uses the visible comparison output for fallback", async () => {
  const ui = createUI();
  ui.node("normal-view").classList.remove("active");
  const snippet = ui.generate();
  await ui.click("btn-copy");
  assert.deepEqual(ui.fallbackValues, [snippet]);
  assert.equal(ui.node("toast").textContent, i18n.t("copySuccess"));
});

test("a throwing copy fallback is reported without an unhandled rejection", async () => {
  const ui = createUI({ fallbackThrows: true });
  ui.generate();
  await ui.click("btn-copy");
  assert.equal(ui.node("toast").textContent, i18n.t("copyFail"));
  assert.equal(ui.node("toast").classList.contains("error"), true);
});

test("pending failure cannot copy a different regenerated snippet", async () => {
  const pending = deferred();
  const ui = createUI({ clipboard: pending.promise });
  const previous = ui.generate();
  const operation = ui.click("btn-copy");
  ui.invalidate("key");
  const current = ui.generate();
  assert.notEqual(previous, current);
  pending.reject(new Error("Late permission denial"));
  await operation;
  assert.deepEqual(ui.fallbackValues, []);
  assert.equal(ui.node("toast").classList.contains("show"), false);
});

for (const field of ["inputCode", "inputCodeCompare"]) {
  test(`${field}: sample actions synchronize editors, preserve raw keys and invalidate generated results`, () => {
    const ui = createUI();
    ui.input(field, "const value = 42;");
    ui.input("key", "003");
    ui.generate();
    ui.node("sample-select").value = "unicode";
    ui.click("btn-load-sample");
    assert.equal(ui.node("inputCode").value, samples.get("unicode", "ja").source);
    assert.equal(ui.node("inputCodeCompare").value, ui.node("inputCode").value);
    assert.equal(ui.node("key").value, "003");
    assert.equal(ui.node("outputCode").value, "");
    ui.changeLanguage("en");
    assert.equal(ui.node("inputCode").value, samples.get("unicode", "en").source);
    ui.click("btn-restore-input");
    assert.equal(ui.node("inputCode").value, "const value = 42;");
    assert.equal(ui.node("inputCodeCompare").value, "const value = 42;");
    assert.equal(ui.node("key").value, "003");
    assert.equal(ui.node("btn-restore-input").disabled, true);
    ui.click("btn-clear-input");
    assert.equal(ui.node(field).value, "");
    assert.equal(ui.node("key").value, "003");
    ui.click("btn-reset-input");
    assert.equal(ui.node(field).value, samples.get("basic", "en").source);
    assert.equal(ui.node("key").value, "3");
  });

  test(`${field}: typing an exact sample is still custom and does not translate`, () => {
    const ui = createUI();
    ui.input(field, samples.get("basic", "ja").source);
    ui.changeLanguage("en");
    assert.equal(ui.node(field).value, samples.get("basic", "ja").source);
    assert.equal(ui.node("sample-state").textContent, i18n.messages.en.sampleCustom);
  });
}

test("changing the pending sample candidate cannot translate an unloaded candidate into the editor", () => {
  const ui = createUI();
  ui.node("sample-select").value = "scope";
  ui.node("sample-select").listeners.get("change")();
  assert.equal(ui.node("inputCode").value, samples.get("basic", "ja").source);
  ui.changeLanguage("en");
  assert.equal(ui.node("sample-select").value, "scope");
  assert.equal(ui.node("inputCode").value, samples.get("basic", "en").source);
});

test("a no-op clear preserves undo but still invalidates a freshly generated empty snippet", () => {
  const ui = createUI();
  ui.input("inputCode", "const previous = 1;");
  ui.click("btn-clear-input");
  ui.generate();
  ui.click("btn-clear-input");
  assert.equal(ui.node("outputCode").value, "");
  ui.click("btn-restore-input");
  assert.equal(ui.node("inputCode").value, "const previous = 1;");
  assert.equal(ui.node("btn-restore-input").disabled, true);
});

test("sample loading preserves an invalid raw key and reset alone restores key 3", () => {
  const ui = createUI();
  ui.input("key", "-1");
  ui.node("sample-select").value = "ascii-wrap";
  ui.click("btn-load-sample");
  assert.equal(ui.node("key").value, "-1");
  assert.equal(ui.node("btn-generate").disabled, true);
  assert.equal(ui.node("key").attributes["aria-invalid"], "true");
  ui.changeLanguage("en");
  assert.equal(ui.node("key").value, "-1");
  assert.equal(ui.node("inputCode").value, samples.get("ascii-wrap", "en").source);
  ui.click("btn-reset-input");
  assert.equal(ui.node("key").value, "3");
  assert.equal(ui.node("btn-generate").disabled, false);
  assert.equal(ui.node("key").attributes["aria-invalid"], "false");
});

function descendants(node) {
  return node.children.flatMap(child => [child, ...descendants(child)]);
}

test("generation renders shared learning results and every main mutation clears even closed rows", () => {
  const mutations = [
    ui => ui.input("inputCode", "const changed = 1;"),
    ui => ui.input("inputCodeCompare", "const changed = 2;"),
    ui => ui.input("key", ""),
    ui => ui.input("key", "94"),
    ui => ui.click("btn-load-sample"),
    ui => ui.click("btn-clear-input"),
    ui => ui.click("btn-reset-input"),
    ui => ui.click("btn-restore-input"),
    ui => ui.click("btn-compare-view"),
    ui => ui.click("btn-normal-view"),
    ui => ui.changeLanguage("en"),
  ];
  for (const mutate of mutations) {
    const ui = createUI();
    ui.click("btn-clear-input");
    ui.click("btn-reset-input");
    ui.generate();
    for (const id of ["trace-rows", "size-rows", "frequency-rows"]) assert.ok(ui.node(id).children.length > 0);
    for (const id of ["trace-details", "size-details", "frequency-details"]) ui.node(id).open = false;
    mutate(ui);
    assert.equal(ui.node("outputCode").value, "");
    for (const id of ["trace-rows", "size-rows", "frequency-rows"]) {
      assert.equal(ui.node(id).children.length, 0, id);
      assert.equal(ui.node(id).textContent, "", id);
    }
    for (const id of ["trace-details", "size-details", "frequency-details"]) {
      ui.node(id).open = true;
      assert.equal(ui.node(id).children.length, 0, "opening a disclosure must not regenerate rows");
    }
  }
});

test("learning limits do not prevent ordinary generation and never leave the old results", () => {
  const ui = createUI();
  ui.generate();
  ui.input("inputCode", "a".repeat(100001));
  const snippet = ui.generate();
  assert.equal(snippet, core.buildSnippet("a".repeat(100001), 3));
  assert.equal(ui.node("btn-copy").disabled, false);
  assert.equal(ui.node("btn-download").disabled, false);
  for (const id of ["trace-rows", "size-rows", "frequency-rows"]) assert.equal(ui.node(id).children.length, 0);
  assert.ok(ui.node("lab-status").textContent.includes("100,000"));
});

test("trace rendering is bounded at 200 code points while a 201-character source is fully measured", () => {
  const ui = createUI();
  ui.input("inputCode", "a".repeat(201));
  ui.generate();
  const rows = descendants(ui.node("trace-rows")).filter(node => node.attributes["data-index"] !== undefined);
  assert.equal(rows.length, 200);
  assert.equal(Number(rows[199].attributes["data-index"]), 199);
  assert.ok(ui.node("lab-status").textContent.length > 0);
});

test("rendered size cells and frequency totals agree with the frozen basic sample", () => {
  const ui = createUI();
  ui.generate();
  const expected = require("./fixtures/learning-expect.json").metrics.sample3;
  const rows = descendants(ui.node("size-rows")).filter(node => node.attributes["data-metric"] !== undefined);
  assert.equal(rows.length, 9);
  for (const row of rows) {
    const metric = row.attributes["data-metric"];
    const cells = descendants(row).filter(node => node.attributes["data-field"] !== undefined);
    assert.equal(cells.length, 3);
    for (const cell of cells) {
      const expectedValue = typeof expected[metric] === "number" ? expected[metric] : expected[metric][cell.attributes["data-field"]];
      assert.equal(Number(cell.attributes["data-value"]), expectedValue);
      assert.equal(cell.textContent, String(expectedValue));
    }
  }
  assert.equal(ui.node("frequency-count").attributes["data-total"], "175");
  assert.equal(ui.node("frequency-count").attributes["data-unique"], "57");
  assert.equal(ui.node("frequency-other").attributes["data-count"], "48");
  assert.equal(ui.node("frequency-passed").attributes["data-count"], "29");
  assert.ok(ui.node("size-ratios").textContent.includes("280.0%"));
  assert.ok(ui.node("size-ratios").textContent.includes("240.0%"));
});

test("empty input and lone surrogates use distinct size warnings without altering the source", () => {
  const ui = createUI();
  ui.click("btn-clear-input");
  ui.generate();
  assert.equal(ui.node("size-ratio-empty").hidden, false);
  assert.match(ui.node("size-ratios").textContent, /—/);
  assert.equal(ui.node("frequency-entropy").attributes["data-source"], "0");
  ui.input("inputCode", "\ud800");
  ui.generate();
  assert.equal(ui.node("inputCode").value, "\ud800");
  assert.equal(ui.node("size-ratio-empty").hidden, true);
  assert.equal(ui.node("size-lone-warning").hidden, false);
  assert.equal(ui.node("size-lone-warning").attributes["data-count"], "1");
  assert.match(ui.node("size-lone-warning").textContent, /U\+FFFD/);
  assert.doesNotMatch(ui.node("trace-rows").textContent, /\ud800/);
  assert.match(ui.node("trace-rows").textContent, /U\+D800/);
});

test("inspector loading is explicit, clears earlier success and compares the captured source after main edits", () => {
  const ui = createUI();
  assert.equal(ui.node("btn-inspect-load").disabled, true);
  const firstSource = ui.node("inputCode").value;
  const first = ui.generate();
  assert.equal(ui.node("btn-inspect-load").disabled, false);
  ui.click("btn-inspect-load");
  assert.equal(ui.node("inspect-input").value, first);
  assert.equal(ui.node("inspect-source").textContent, "");
  ui.input("inputCode", "const changed = 2;");
  ui.input("key", "invalid");
  assert.equal(ui.node("btn-inspect-load").disabled, true);
  ui.click("btn-inspect");
  assert.equal(ui.node("inspect-source").textContent, firstSource);
  const comparison = ui.node("inspect-comparison").textContent;
  assert.ok(comparison.length > 0);
  assert.equal(comparison, i18n.messages.ja.inspectEqual);
  assert.doesNotMatch(ui.node("inspect-length").textContent, /\{[A-Za-z0-9]+\}/);
  assert.equal(ui.node("inspect-length").attributes["data-code-points"], "175");
  assert.equal(ui.node("inspect-length").attributes["data-utf16-units"], "175");
  assert.equal(ui.node("inspect-length").attributes["data-utf8-bytes"], "225");
  ui.input("key", "3");
  const second = ui.generate();
  assert.equal(ui.node("inspect-input").value, first);
  ui.click("btn-inspect-load");
  assert.equal(ui.node("inspect-input").value, second);
  for (const id of ["inspect-source", "inspect-key", "inspect-length", "inspect-comparison", "inspect-error"]) {
    assert.equal(ui.node(id).textContent, "", id);
  }
  assert.equal(ui.runCount(), 0);
});

test("manual inspector edits drop provenance and failed inspection clears every previous result", () => {
  const ui = createUI();
  const snippet = ui.generate();
  ui.click("btn-inspect-load");
  ui.click("btn-inspect");
  const capturedComparison = ui.node("inspect-comparison").textContent;
  ui.input("inspect-input", snippet);
  assert.equal(ui.node("inspect-source").textContent, "");
  ui.click("btn-inspect");
  assert.notEqual(ui.node("inspect-comparison").textContent, capturedComparison);
  ui.input("inspect-input", "not a canonical snippet");
  ui.click("btn-inspect");
  for (const id of ["inspect-source", "inspect-key", "inspect-length", "inspect-comparison"]) {
    assert.equal(ui.node(id).textContent, "", id);
  }
  assert.ok(ui.node("inspect-error").textContent.length > 0);
  assert.ok(!ui.node("inspect-error").textContent.includes("not a canonical snippet"));
  ui.click("btn-inspect-clear");
  assert.equal(ui.node("inspect-input").value, "");
  assert.equal(ui.node("inspect-error").textContent, "");
  assert.equal(ui.runCount(), 0);
});

test("inspector language changes preserve raw restored CRLF and surrogates and never write them into the editor", () => {
  const ui = createUI();
  const originalMain = ui.node("inputCode").value;
  const raw = "A\r\nB\ud800";
  const snippet = core.buildSnippet(raw, 94);
  ui.input("inspect-input", snippet);
  ui.click("btn-inspect");
  assert.equal(ui.node("inspect-source").textContent, raw);
  assert.equal(ui.node("inputCode").value, originalMain);
  ui.changeLanguage("en");
  assert.equal(ui.node("inspect-input").value, snippet);
  assert.equal(ui.node("inspect-source").textContent, raw);
  assert.equal(ui.runCount(), 0);
  assert.doesNotMatch(ui.node("inspect-length").textContent, /\{[A-Za-z0-9]+\}/);
});

test("empty inspection input differs from a canonical empty source and stale loading cannot overwrite inspection input", () => {
  const ui = createUI();
  ui.click("btn-inspect");
  assert.ok(ui.node("inspect-error").textContent.length > 0);
  const snippet = core.buildSnippet("", 0);
  ui.input("inspect-input", snippet);
  ui.click("btn-inspect");
  assert.equal(ui.node("inspect-error").textContent, "");
  assert.equal(ui.node("inspect-source").textContent, "");
  assert.ok(ui.node("inspect-key").textContent.includes("0"));
  ui.click("btn-inspect-load");
  assert.equal(ui.node("inspect-input").value, snippet);
  assert.equal(ui.runCount(), 0);
});

test("all main-editor mutations preserve independent inspection input, result and captured comparison", () => {
  const mutations = [
    ui => ui.input("inputCode", "changed"), ui => ui.input("inputCodeCompare", "changed"),
    ui => ui.input("key", ""), ui => ui.click("btn-load-sample"), ui => ui.click("btn-clear-input"),
    ui => ui.click("btn-reset-input"), ui => ui.click("btn-restore-input"),
    ui => ui.click("btn-compare-view"), ui => ui.changeLanguage("en"),
  ];
  for (const mutate of mutations) {
    const ui = createUI();
    ui.click("btn-clear-input");
    ui.click("btn-reset-input");
    const source = ui.node("inputCode").value;
    const snippet = ui.generate();
    ui.click("btn-inspect-load");
    ui.click("btn-inspect");
    mutate(ui);
    assert.equal(ui.node("inspect-input").value, snippet);
    assert.equal(ui.node("inspect-source").textContent, source);
    assert.equal(ui.node("inspect-comparison").attributes["data-state"], "equal");
    assert.equal(ui.node("inspect-status").attributes["data-origin"], "loaded");
    assert.equal(ui.runCount(), 0);
  }
});

test("independent reference preserves captured-source comparison and distinguishes empty from unset", () => {
  const ui = createUI();
  ui.input("inputCode", "A😀B");
  ui.generate();
  ui.click("btn-inspect-load");
  ui.click("btn-inspect");
  assert.equal(ui.node("btn-reference-compare").disabled, true);
  ui.input("reference-input", "A😀C");
  assert.equal(ui.node("reference-status").attributes["data-state"], "pending");
  ui.click("btn-reference-compare");
  assert.equal(ui.node("inspect-comparison").attributes["data-state"], "equal");
  assert.equal(ui.node("reference-status").attributes["data-state"], "different");
  assert.equal(ui.node("reference-status").attributes["data-code-point-index"], "2");
  ui.input("reference-input", "A😀C");
  assert.equal(ui.node("context-source").children.length, 0);
  ui.input("reference-input", "");
  assert.equal(ui.node("btn-reference-compare").disabled, false);
  ui.click("btn-reference-compare");
  assert.ok(ui.node("context-source").textContent.includes("EOF"));
  ui.click("btn-reference-clear");
  assert.equal(ui.node("btn-reference-compare").disabled, true);
  assert.equal(ui.node("inspect-source").textContent, "A😀B");
  assert.equal(ui.node("inspect-comparison").attributes["data-state"], "equal");
  ui.input("inspect-input", core.buildSnippet("", 0));
  ui.click("btn-inspect");
  ui.input("reference-input", "");
  ui.click("btn-reference-compare");
  assert.equal(ui.node("reference-status").attributes["data-state"], "equal");
  assert.equal(ui.node("context-panels").hidden, true);
});

test("reference load keeps exact raw CRLF despite textarea normalization until a manual input event", () => {
  const ui = createUI();
  const raw = "A\r\nB\ud800";
  ui.input("inputCode", raw);
  let renderedValue = "";
  Object.defineProperty(ui.node("reference-input"), "value", {
    get() { return renderedValue; }, set(value) { renderedValue = value.replace(/\r\n?/g, "\n"); },
  });
  ui.input("inspect-input", core.buildSnippet(raw, 3));
  ui.click("btn-inspect");
  ui.click("btn-reference-load");
  assert.equal(ui.node("reference-input").value, "A\nB\ud800");
  assert.equal(ui.node("reference-origin").attributes["data-origin"], "loaded");
  ui.click("btn-reference-compare");
  assert.equal(ui.node("reference-status").attributes["data-state"], "equal");
  ui.changeLanguage("en");
  assert.equal(ui.node("reference-status").attributes["data-state"], "equal");
  ui.input("reference-input", renderedValue);
  ui.click("btn-reference-compare");
  assert.equal(ui.node("reference-origin").attributes["data-origin"], "manual");
  assert.equal(ui.node("reference-status").attributes["data-code-point-index"], "1");
});

test("every inspection mutation clears independent comparison only, retaining reference text", () => {
  const mutations = [
    ui => ui.input("inspect-input", ui.node("inspect-input").value),
    ui => ui.click("btn-inspect-load"), ui => ui.click("btn-inspect-clear"), ui => ui.click("btn-inspect"),
    ui => { ui.input("inspect-input", "invalid"); ui.click("btn-inspect"); },
  ];
  for (const mutate of mutations) {
    const ui = createUI();
    ui.generate();
    ui.click("btn-inspect-load");
    ui.click("btn-inspect");
    ui.input("reference-input", "different");
    ui.click("btn-reference-compare");
    mutate(ui);
    assert.equal(ui.node("reference-input").value, "different");
    assert.notEqual(ui.node("reference-status").attributes["data-state"], "different");
    assert.equal(ui.node("context-source").children.length, 0);
    assert.equal(ui.node("context-panels").hidden, true);
  }
});

test("all main mutations preserve independent comparison, including quiz load and shared settings", () => {
  const mutations = [
    ui => ui.input("inputCode", "other"), ui => ui.input("inputCodeCompare", "other"),
    ui => ui.input("key", ""), ui => ui.click("btn-load-sample"), ui => ui.click("btn-clear-input"),
    ui => ui.click("btn-reset-input"), ui => ui.click("btn-restore-input"), ui => ui.click("btn-quiz-load"),
    ui => ui.click("btn-compare-view"), ui => ui.changeLanguage("en"),
    ui => { ui.hash("#cjo=v1&sample=unicode&key=94&lang=en&view=compare"); ui.click("btn-share-apply"); },
  ];
  for (const mutate of mutations) {
    const ui = createUI();
    ui.input("inspect-input", core.buildSnippet("A😀B", 3));
    ui.click("btn-inspect");
    ui.input("reference-input", "A😀C");
    ui.click("btn-reference-compare");
    mutate(ui);
    assert.equal(ui.node("reference-input").value, "A😀C");
    assert.equal(ui.node("reference-status").attributes["data-state"], "different");
    assert.equal(ui.node("reference-status").attributes["data-code-point-index"], "2");
    assert.equal(ui.node("inspect-source").textContent, "A😀B");
    assert.equal(ui.runCount(), 0);
  }
});

test("reference limits clear prior context and display tokens neutralize control characters", () => {
  const ui = createUI();
  const source = "A\u202e\ud800\u0301";
  ui.input("inspect-input", core.buildSnippet(source, 0));
  ui.click("btn-inspect");
  ui.input("reference-input", "A\u202d\ud800\u0301");
  ui.click("btn-reference-compare");
  for (const id of ["context-source", "context-restored"]) {
    assert.doesNotMatch(ui.node(id).textContent, /[\u202d\u202e\ud800\u0301]/u);
    assert.match(ui.node(id).textContent, /U\+D800/);
    assert.match(ui.node(id).textContent, /U\+0301/);
  }
  ui.input("reference-input", "x".repeat(2_000_001));
  assert.equal(ui.node("reference-status").attributes["data-state"], "error");
  assert.equal(ui.node("btn-reference-compare").disabled, true);
  ui.click("btn-reference-compare");
  assert.equal(ui.node("context-source").children.length, 0);
  assert.equal(ui.node("reference-input").value.length, 2_000_001);
  assert.equal(ui.runCount(), 0);
});

test("inspection treats side-effect markers and HTML-shaped source as inert strings", () => {
  const marker = "__day042InspectorMarker";
  const previous = Object.getOwnPropertyDescriptor(globalThis, marker);
  let effects = 0;
  Object.defineProperty(globalThis, marker, { configurable: true, set() { effects++; }, get() { return 0; } });
  try {
    const ui = createUI();
    const cases = ["globalThis.__day042InspectorMarker = 1;", '<span data-inspector-marker="plain">text</span>'];
    for (const source of cases) {
      ui.input("inspect-input", core.buildSnippet(source, 3));
      ui.click("btn-inspect");
      assert.equal(ui.node("inspect-source").textContent, source);
      assert.equal(ui.node("inspect-source").children.length, 0);
      assert.equal(ui.node("inspect-error").textContent, "");
    }
    assert.equal(ui.runCount(), 0);
    assert.equal(effects, 0);
  } finally {
    if (previous) Object.defineProperty(globalThis, marker, previous);
    else delete globalThis[marker];
  }
});
