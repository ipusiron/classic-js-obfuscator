"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const i18n = require("../js/i18n.js");
const fixture = require("./fixtures/expect.json");
const learning = require("../js/learning-core.js");
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
    const placeholders = value => (value.match(/\{[a-zA-Z0-9_]+\}/g) || []).sort();
    assert.deepEqual(placeholders(i18n.messages.ja[key]), placeholders(i18n.messages.en[key]), key);
    for (const language of ["ja", "en"]) {
      for (const token of placeholders(i18n.messages[language][key])) {
        assert.match(token, /^\{[a-zA-Z]+\}$/, `${language}.${key}: placeholder names must contain letters only`);
      }
    }
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

test("inspection lengths substitute all three units in both languages", () => {
  const expected = {
    ja: "復元長: 1コードポイント／2 UTF-16単位／4 UTF-8バイト",
    en: "Recovered length: 1 code points / 2 UTF-16 code units / 4 UTF-8 bytes"
  };
  for (const language of ["ja", "en"]) {
    const env = environment({ search: "?lang=" + language });
    env.api.init();
    assert.equal(env.api.t("inspectLength", { codePoints: 1, units: 2, bytes: 4 }), expected[language]);
  }
});

test("localized help explains the ordered learning and non-executing recovery workflow", () => {
  const workflows = {
    ja: ["「難読化コードを生成」", "「変換過程」", "「サイズの分解」", "「現在の生成物を読み込む」", "「実行せず復元する」"],
    en: ["Generate obfuscated code", "Transformation steps", "Size breakdown", "Load current generated snippet", "Recover without executing"]
  };
  const headings = {
    ja: ["学習ラボの読み方", "実行しない復号確認", "教材と一段階の入力復帰", "上限とローカルファイル"],
    en: ["Reading the learning lab", "Recovery without execution", "Samples and one-step input restore", "Limits and local files"]
  };
  for (const language of ["ja", "en"]) {
    const html = i18n.messages[language].helpHtml;
    let previous = -1;
    for (const action of workflows[language]) {
      const index = html.indexOf(action);
      assert.ok(index > previous, `${language}: workflow step ${action} is missing or out of order`);
      previous = index;
    }
    for (const heading of headings[language]) assert.ok(html.includes(heading), `${language}: ${heading}`);
    assert.equal((html.match(/<h3>/g) || []).length, 13, `${language}: complete help headings`);
  }
});

test("help limits match core constants and specify their units and display-only scope", () => {
  for (const language of ["ja", "en"]) {
    const html = i18n.messages[language].helpHtml;
    for (const limit of [learning.MAX_SOURCE_CODE_UNITS, learning.MAX_INSPECT_CODE_UNITS]) {
      assert.match(html, new RegExp(limit.toLocaleString("en-US") + "\\s*UTF-16"), language);
    }
    const traceUnit = language === "ja" ? "コードポイント" : " code points";
    const frequencyUnit = language === "ja" ? "種類" : " character types";
    assert.ok(html.includes(learning.MAX_TRACE_ROWS + traceUnit), `${language}: trace limit`);
    assert.ok(html.includes(learning.MAX_FREQUENCY_ROWS + frequencyUnit), `${language}: frequency limit`);
    assert.match(html, language === "ja" ? /集計自体は全入力/ : /Aggregation covers the entire input/);
    assert.match(html, language === "ja" ? /既存の生成、コピー、保存は制限しません/ : /does not restrict existing generation/);
  }
});

test("help preserves distinctions between format, provenance, memory equality and safety", () => {
  const required = {
    ja: [
      "一般のJavaScript難読化を解く機能ではありません", "作者や配布元の信頼性を保証しません",
      "読み込み時の元入力", "現在の入力との比較ではありません", "比較元はありません", "1始まりのコードポイント位置",
      "コードポイント数、UTF-16単位数、UTF-8バイト数", "元コード＋エスケープ増分＋ラッパー＝生成物",
      "元コードが空なら定義できません", "回数の集合とShannonエントロピーは不変", "安全性や解析不能性を意味しません",
      "貼り付け前の改行形式は判定できません", "生のJS文字列", "U+FFFD", "保存後の一致を保証しません",
      "鍵は「003」や空欄などの生文字列のまま保持", "初期化だけが現在言語のbasic教材と鍵「3」に戻します",
      "本文と生の鍵、教材ID、未編集かどうか、教材の言語", "同じ言語で復帰", "原文を優先し、カスタム入力"
    ],
    en: [
      "not a general JavaScript deobfuscator", "does not validate JavaScript syntax, safety, or trust",
      "original source at loading time, not the current input", "no comparison source is available", "1-based code-point positions",
      "code points, UTF-16 code units, and UTF-8 bytes", "Source + escaping overhead + wrapper = snippet",
      "ratio is undefined for empty source", "preserves frequency counts and Shannon entropy", "does not imply safety",
      "line endings before pasting cannot be identified", "raw JS string", "U+FFFD", "does not guarantee equality after saving",
      "preserves the raw key, including 003 or blank", "Reset alone selects basic in the current language and raw key 3",
      "source, raw key, sample ID, pristine flag, and sample language", "restored in the same language", "old source as custom input"
    ]
  };
  for (const language of ["ja", "en"]) {
    for (const text of required[language]) {
      assert.ok(i18n.messages[language].helpHtml.includes(text), `${language}: ${text}`);
    }
  }
});

test("local-file notices and tutorial retain learning and non-executing recovery", () => {
  for (const key of ["fileNotice", "tour5", "helpHtml"]) {
    assert.match(i18n.messages.ja[key], /file:\/\//, `ja.${key}`);
    assert.match(i18n.messages.ja[key], /学習ラボ/, `ja.${key}`);
    assert.match(i18n.messages.ja[key], /非実行の復号確認/, `ja.${key}`);
    assert.match(i18n.messages.en[key], /file:\/\//, `en.${key}`);
    assert.match(i18n.messages.en[key], /learning/, `en.${key}`);
    assert.match(i18n.messages.en[key], /non-executing recovery/, `en.${key}`);
  }
});
