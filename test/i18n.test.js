"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const i18n = require("../js/i18n.js");
const fixture = require("./fixtures/expect.json");
const script = fs.readFileSync(path.join(__dirname, "../js/i18n.js"), "utf8");

function environment({ search = "", saved = null, navigatorLanguage = "en-US", blocked = false } = {}) {
  const nodes = new Map();
  const writes = [];
  const events = [];
  function node(selector) {
    if (!nodes.has(selector)) {
      nodes.set(selector, {
        textContent: "",
        innerHTML: "",
        value: "user code stays unchanged",
        attributes: {},
        listeners: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(name, callback) { this.listeners[name] = callback; }
      });
    }
    return nodes.get(selector);
  }
  const document = {
    documentElement: { lang: "ja" },
    querySelectorAll(selector) { return selector.split(",").map(part => node(part.trim())); },
    getElementById(id) { return node("#" + id); }
  };
  const context = {
    document,
    URLSearchParams,
    location: { search },
    navigator: { language: navigatorLanguage },
    localStorage: {
      getItem(key) {
        if (blocked) throw new Error("Storage denied");
        assert.equal(key, "language");
        return saved;
      },
      setItem(key, value) {
        if (blocked) throw new Error("Storage denied");
        writes.push([key, value]);
      }
    },
    CustomEvent: class {
      constructor(type, { detail }) { this.type = type; this.detail = detail; }
    },
    dispatchEvent(event) {
      events.push({ type: event.type, ...event.detail, renderedLanguage: document.documentElement.lang });
    }
  };
  vm.createContext(context);
  vm.runInContext(script, context);
  return { api: context.ObfuscatorI18n, document, node, writes, events };
}

test("JA and EN dictionaries have matching keys and placeholders", () => {
  assert.deepEqual(Object.keys(i18n.messages.ja).sort(), Object.keys(i18n.messages.en).sort());
  for (const key of Object.keys(i18n.messages.ja)) {
    const placeholders = value => (value.match(/\{[a-zA-Z]+\}/g) || []).sort();
    assert.deepEqual(placeholders(i18n.messages.ja[key]), placeholders(i18n.messages.en[key]), key);
    assert.doesNotMatch(i18n.messages.en[key], /[\u3040-\u30ff\u3400-\u9fff]/u, key);
  }
  for (const [, key] of i18n.bindings) assert.equal(typeof i18n.messages.ja[key], "string", key);
});

test("the Japanese sample exactly matches the supplied reference", () => {
  assert.equal(i18n.messages.ja.sample, fixture.sample);
  assert.match(i18n.messages.en.sample, /Hello Obfuscation!/);
  assert.match(i18n.messages.en.sample, /document\.body\.appendChild\(p\)/);
});

test("URL language takes priority over storage and browser settings", () => {
  const env = environment({ search: "?lang=en", saved: "ja", navigatorLanguage: "ja-JP" });
  env.api.init();
  assert.equal(env.api.language, "en");
  assert.equal(env.document.documentElement.lang, "en");
  assert.equal(env.events.length, 0, "initialization must not dispatch a language change");
});

test("invalid URL falls back to a valid saved language", () => {
  const env = environment({ search: "?lang=fr", saved: "ja", navigatorLanguage: "en-US" });
  env.api.init();
  assert.equal(env.api.language, "ja");
});

test("browser language supplies the fallback, defaulting to English", () => {
  for (const [browser, expected] of [["ja-JP", "ja"], ["ja", "ja"], ["en-US", "en"], ["fr", "en"]]) {
    const env = environment({ saved: "bad", navigatorLanguage: browser });
    env.api.init();
    assert.equal(env.api.language, expected);
  }
});

test("language changes persist, apply before dispatch, and toggle with the button", () => {
  const env = environment({ search: "?lang=ja" });
  env.api.init();
  env.api.init();
  assert.equal(env.node("#language-btn").textContent, "EN");
  env.node("#language-btn").listeners.click();
  assert.equal(env.api.language, "en");
  assert.equal(env.node("#language-btn").textContent, "JA");
  assert.equal(env.node("#btn-generate").textContent, i18n.messages.en.generate);
  assert.equal(env.node("#theme-toggle").attributes["aria-label"], "Switch theme");
  assert.equal(env.node("#help-body").innerHTML, i18n.messages.en.helpHtml);
  assert.deepEqual(env.writes, [["language", "en"]]);
  assert.deepEqual(env.events, [{
    type: "languagechange", previous: "ja", language: "en", renderedLanguage: "en"
  }]);
  env.node("#language-btn").listeners.click();
  assert.equal(env.api.language, "ja");
  assert.equal(env.events.length, 2);
});

test("blocked storage does not break initialization or language switching", () => {
  const env = environment({ blocked: true, navigatorLanguage: "ja-JP" });
  env.api.init();
  assert.equal(env.api.language, "ja");
  assert.equal(env.api.setLanguage("en"), true);
  assert.equal(env.node("#btn-copy").textContent, "Copy output");
  assert.equal(env.events.length, 1);
});

test("invalid or unchanged language does not dispatch, persist, or touch user input", () => {
  const env = environment({ search: "?lang=ja" });
  const input = env.node("#inputCode");
  env.api.init();
  assert.equal(env.api.setLanguage("ja"), false);
  assert.equal(env.api.setLanguage("fr"), false);
  assert.equal(env.events.length, 0);
  assert.equal(env.writes.length, 0);
  env.api.setLanguage("en");
  assert.equal(input.value, "user code stays unchanged");
});

test("translation substitutes only named own parameters without interpreting replacement tokens", () => {
  const env = environment({ search: "?lang=en" });
  env.api.init();
  assert.equal(env.api.t("step", { index: 2, total: 6 }), "Step 2/6");
  assert.equal(env.api.t("step", { index: "$&", total: 6 }), "Step $&/6");
  assert.equal(env.api.t("step", {}), "Step {index}/{total}");
  assert.equal(env.api.t("missingKey"), "missingKey");
});
