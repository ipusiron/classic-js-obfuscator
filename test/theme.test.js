"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
const bootstrap = fs.readFileSync(path.join(root, "js/theme-init.js"), "utf8");

function setup(saved, blocked = false) {
  const attributes = new Map();
  const writes = [];
  let reads = 0;
  const button = { addEventListener() {}, textContent: "" };
  const document = {
    documentElement: {
      setAttribute(key, value) { attributes.set(key, value); },
      getAttribute(key) { return attributes.get(key) ?? null; },
    },
    get body() { throw new Error("Theme must not depend on body availability"); },
    getElementById() { return button; },
    addEventListener() {},
  };
  const context = vm.createContext({ document, window: {}, ObfuscatorCore: {}, localStorage: {
    getItem(key) { reads++; assert.equal(key, "theme"); if (blocked) throw Error("denied"); return saved; },
    setItem(key, value) { if (blocked) throw Error("denied"); writes.push([key, value]); },
  } });
  vm.runInContext(bootstrap, context);
  return { context, attributes, writes, button, reads: () => reads };
}

test("theme bootstrap chooses only the saved light value, before body exists, without writes", () => {
  for (const saved of ["light", "dark", null, "", "invalid", "LIGHT"]) {
    const state = setup(saved);
    assert.equal(state.attributes.get("data-theme"), saved === "light" ? "light" : "dark");
    assert.equal(state.reads(), 1);
    assert.deepEqual(state.writes, []);
  }
});

test("theme bootstrap tolerates storage read rejection and an unavailable storage object", () => {
  assert.equal(setup("light", true).attributes.get("data-theme"), "dark");
  const values = [];
  const context = vm.createContext({ document: { documentElement: { setAttribute: (...args) => values.push(args) } } });
  Object.defineProperty(context, "localStorage", { get() { throw Error("unavailable"); } });
  vm.runInContext(bootstrap, context);
  assert.deepEqual(values, [["data-theme", "dark"]]);
});

test("theme bootstrap is a blocking local head script before the stylesheet and body", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const script = '<script src="js/theme-init.js"></script>';
  assert.equal(html.split(script).length, 2);
  assert.ok(html.indexOf(script) < html.indexOf('<link rel="stylesheet"'));
  assert.ok(html.indexOf(script) < html.indexOf("</head>"));
  assert.ok(html.indexOf('http-equiv="Content-Security-Policy"') < html.indexOf(script));
});

test("theme controls keep the prepaint choice and update the same root, including storage rejection", () => {
  const main = fs.readFileSync(path.join(root, "script.js"), "utf8");
  for (const blocked of [false, true]) {
    const state = setup("light", blocked);
    vm.runInContext(main, state.context);
    state.context.initTheme();
    assert.equal(state.attributes.get("data-theme"), blocked ? "dark" : "light");
    assert.equal(state.reads(), 1, "late initialization must not choose the theme again");
    state.context.window.setTheme("dark");
    assert.equal(state.attributes.get("data-theme"), "dark");
    assert.equal(state.button.textContent, "☀️");
    state.context.window.setTheme("light");
    assert.equal(state.attributes.get("data-theme"), "light");
    assert.equal(state.button.textContent, "🌙");
  }
});
