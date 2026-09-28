"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const base = require("../js/obfuscator-core.js");
const sampleData = require("../js/samples.js").samples;
const sample = (id) => sampleData.find((item) => item.id === id);
const questions = require("../js/quiz-data.js");
const quiz = require("../js/quiz-core.js");
const share = require("../js/share-settings.js");
const context = require("../js/comparison-context.js");
const editor = require("../js/editor-state.js");
const actual = {
  QUESTIONS: questions, SAMPLE_IDS: share.sampleIds, SHARE_BASE: share.BASE, SHARE_LIMIT: share.LIMIT,
  createShare: share.create, parseShare: share.parse, comparisonContext: context.compare,
  applySettings: editor.applySettings,
  quizCreate: quiz.create, quizSelect: quiz.select, quizGrade: quiz.grade,
  quizNavigate: quiz.navigate, quizScore: quiz.score,
};

test("settings apply atomically captures five pre-apply fields; no-op retains the prior restore point", () => {
  const before = Object.freeze({ source: "custom\r\n\u{1F600}", key: " 003 ", sampleId: "basic",
    pristine: false, sampleLanguage: "ja", undo: Object.freeze({ source: "older" }) });
  const settings = { sampleId: "unicode", shift: 94, language: "en", view: "compare" };
  const after = actual.applySettings(before, settings);
  assert.deepEqual(after.undo, { source: before.source, key: " 003 ", sampleId: "basic",
    pristine: false, sampleLanguage: "ja" });
  assert.equal(after.source, sample("unicode").en.source);
  assert.equal(after.key, "94");
  assert.equal(after.sampleLanguage, "en");
  assert.equal(after.pristine, true);
  assert.equal(Object.isFrozen(after.undo), true);
  assert.equal(actual.applySettings(after, settings), after);
  assert.equal(actual.applySettings(after, { ...settings, view: "normal" }), after);
  for (const invalid of [{ ...settings, shift: 95 }, { ...settings, language: "fr" },
    { ...settings, shift: "3" }, { ...settings, sampleId: "custom" }, { ...settings, view: "unknown" }]) {
    assert.throws(() => actual.applySettings(before, invalid), RangeError);
    assert.equal(before.undo.source, "older");
  }
});


test("all 2280 valid settings round-trip; raw keys canonicalize without code or local paths", () => {
  let count = 0;
  for (const sampleId of actual.SAMPLE_IDS) for (let shift = 0; shift < 95; shift++) {
    for (const language of ["ja", "en"]) for (const view of ["normal", "compare"]) {
      const result = actual.createShare({ sampleId, rawKey: ` 00${shift} `, language, view, source: "NOT_SHARED" });
      assert.equal(result.ok, true);
      assert.equal(result.url, actual.SHARE_BASE + result.hash);
      assert.deepEqual(actual.parseShare(result.hash).settings, { sampleId, shift, language, view });
      assert.doesNotMatch(result.url, /NOT_SHARED|file:|source=|code=|%/);
      count++;
    }
  }
  assert.equal(count, 2280);
  assert.equal(actual.createShare({ sampleId: "unicode", rawKey: "003", language: "en", view: "compare" }).url,
    "https://ipusiron.github.io/classic-js-obfuscator/#cjo=v1&sample=unicode&key=3&lang=en&view=compare");
});


test("strict share grammar rejects malformed values and leaves unrelated anchors alone", () => {
  const valid = "#cjo=v1&sample=basic&key=3&lang=ja&view=normal";
  assert.deepEqual(actual.parseShare("#lab"), { ok: true, kind: "none" });
  assert.deepEqual(actual.parseShare(""), { ok: true, kind: "none" });
  assert.equal(actual.parseShare(null).reason, "notString");
  for (const hash of [
    valid + "&source=anything", valid + "&key=3", valid.replace("sample=basic", "sample=__proto__"),
    valid.replace("key=3", "key=03"), valid.replace("key=3", "key=95"), valid.replace("key=3", "key=-1"),
    valid.replace("key=3", "key=%33"), valid.replace("key=3", "key=+3"), valid.replace("key=3", "key=3.0"),
    valid.replace("key=3", "key=3e0"), valid.replace("lang=ja", "lang=JA"), valid.replace("lang=ja", "lang="),
    valid.replace("view=normal", "view=other"), valid.replace("cjo=v1", "cjo=v2"),
    valid.replace("key=3&", ""), valid.replace("sample=basic", "sample=basic=extra"),
    valid.replace("key=3", "sample=basic"), valid + "\n", valid + "&", valid + "#extra",
  ]) assert.equal(actual.parseShare(hash).ok, false, hash);
  const boundary = valid + "x".repeat(actual.SHARE_LIMIT - valid.length);
  assert.equal(actual.parseShare(boundary).reason, "view");
  assert.equal(actual.parseShare(boundary + "x").reason, "tooLarge");
  assert.equal(actual.parseShare("#cjo=v1&view=normal&lang=ja&key=3&sample=basic").ok, true);
  for (const rawKey of ["", "-1", "95", "1.5", "1e1", "３", null]) {
    assert.equal(actual.createShare({ sampleId: "basic", rawKey, language: "ja", view: "normal" }).ok, false);
  }
});
