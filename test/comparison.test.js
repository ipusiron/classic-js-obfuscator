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
  QUESTIONS: questions, SAMPLE_IDS: share.sampleIds, SHARE_BASE: share.BASE,
  createShare: share.create, parseShare: share.parse, comparisonContext: context.compare,
  applySettings: editor.applySettings,
  quizCreate: quiz.create, quizSelect: quiz.select, quizGrade: quiz.grade,
  quizNavigate: quiz.navigate, quizScore: quiz.score,
};

test("fixed context examples retain every token, bound and EOF marker", () => {
  for (const item of require("./fixtures/phase3-expect.json").comparisons) {
    assert.deepEqual(context.compare(item.source, item.restored), item.expected);
  }
});

test("comparison context agrees with an independent code-point-array oracle", () => {
  const inputs = ["", "A", "AB", "A\u{1F600}B", "A\u{1F600}C", "e\u0301", "\u00E9", "A\nB", "A\r\nB",
    "\uD800", "\uDC00", "\u202Eabc", "\0\t ", "x".repeat(100), "x".repeat(50) + "Y" + "x".repeat(49)];
  for (const source of inputs) for (const restored of inputs) {
    const result = actual.comparisonContext(source, restored);
    assert.equal(result.ok, true);
    assert.equal(result.equal, source === restored);
    if (result.equal) continue;
    const left = [...source], right = [...restored];
    let index = 0;
    while (index < Math.min(left.length, right.length) && left[index] === right[index]) index++;
    assert.equal(result.index, index);
    for (const [name, values] of [["source", left], ["restored", right]]) {
      const context = result[name];
      const start = Math.max(0, index - 16);
      assert.deepEqual(context.tokens.map(token => token.codePoint), values.slice(start, index + 17).map(c => c.codePointAt(0)));
      assert.equal(context.start, start);
      assert.equal(context.total, values.length);
      assert.equal(context.eofAtMismatch, index === values.length);
      assert.equal(context.prefixOmitted, start > 0);
      assert.equal(context.suffixOmitted, values.length > index + 17);
      assert.ok(context.tokens.length <= 33);
      for (const token of context.tokens) assert.equal(token.atMismatch, token.index === index);
    }
  }
  assert.equal(actual.comparisonContext("A\u{1F600}B", "A\u{1F600}C").index, 2);
  assert.equal(actual.comparisonContext("", "A").source.eofAtMismatch, true);
  assert.equal(actual.comparisonContext("A", "").restored.eofAtMismatch, true);
});


test("comparison limits are in UTF-16 units, before equality checks", () => {
  const atLimit = "x".repeat(2_000_000);
  assert.equal(actual.comparisonContext(atLimit, atLimit).equal, true);
  assert.equal(actual.comparisonContext(atLimit + "x", atLimit + "x").reason, "tooLarge");
  assert.equal(actual.comparisonContext(atLimit, atLimit.slice(0, -1) + "y").index, 1_999_999);
  const emoji = "\u{1F600}".repeat(1_000_000);
  assert.equal(actual.comparisonContext(emoji, emoji).equal, true);
  assert.equal(actual.comparisonContext(emoji + "x", "").reason, "tooLarge");
  assert.equal(actual.comparisonContext(null, "").reason, "notString");
});
