"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const core = require("../js/obfuscator-core.js");
const i18n = require("../js/i18n.js");
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
  const document = {
    activeElement: null,
    addEventListener() {},
    getElementById(id) { return node(id); },
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
      nodes.set(id, {
        id,
        value: id === "key" ? "3" : "",
        textContent: "",
        disabled: false,
        listeners,
        attributes: {},
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
        addEventListener(name, handler) { listeners.set(name, handler); },
        focus() { document.activeElement = this; },
        select() {}
      });
    }
    return nodes.get(id);
  }
  node("normal-view").classList.add("active");
  const window = {
    addEventListener(name, handler) { windowListeners.set(name, handler); }
  };
  class SandboxRunner {
    static get supported() { return true; }
    reset() {}
  }
  const context = {
    ObfuscatorCore: core,
    ObfuscatorI18n: i18n,
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
  return { node, click, generate, invalidate, clipboardValues, fallbackValues };
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
