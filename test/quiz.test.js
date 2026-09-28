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

test("question data and immutable fixture match the supplied authoring digest", () => {
  const fs = require("node:fs");
  const crypto = require("node:crypto");
  const bytes = fs.readFileSync(require.resolve("./fixtures/phase3-expect.json"));
  const expectedHash = "93d1d4a991c6ecc69872a4c4a2ea8ccce1badbecf8fabcb2600a31be8e182a4e";
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), expectedHash);
  assert.deepEqual(questions, JSON.parse(bytes).questions);
});

test("12 bilingual questions have stable IDs, three options, six sample pairs and independently checked evidence", () => {
  assert.equal(actual.QUESTIONS.length, 12);
  assert.equal(new Set(actual.QUESTIONS.map(item => item.id)).size, 12);
  assert.deepEqual(actual.QUESTIONS.map(item => item.answerId), ["b", "b", "a", "c", "b", "c", "b", "a", "c", "b", "c", "a"]);
  for (const id of actual.SAMPLE_IDS) assert.equal(actual.QUESTIONS.filter(item => item.sampleId === id).length, 2);
  for (const item of actual.QUESTIONS) {
    assert.equal(Object.isFrozen(item), true);
    assert.deepEqual(item.choices.map(choice => choice.id), ["a", "b", "c"]);
    for (const language of ["ja", "en"]) {
      assert.ok(item.prompt[language]); assert.ok(item.explanation[language]);
      item.choices.forEach(choice => assert.ok(choice.text[language]));
    }
    const e = item.evidence;
    if (e.type === "shift") assert.equal(base.caesarShift(e.input, e.shift), e.expected);
    if (e.type === "range") assert.equal(Array.from({length: 127}, (_, i) => i).filter(i => i >= 32).length, e.expected);
    if (e.type === "size") assert.deepEqual([[...e.input].length, e.input.length, Buffer.byteLength(e.input)], e.expected);
    if (e.type === "escape") assert.equal(base.escapeForJsString(e.input), e.expected);
    if (e.type === "sampleLf") for (const language of ["ja", "en"]) {
      assert.equal((sample(item.sampleId)[language].source.match(/\n/g) || []).length, e.expected);
    }
  }
  // Only the immutable, trusted samples run here; never user/inspection input.
  for (const id of ["console", "scope"]) {
    const logs = [];
    const context = { console: Object.fromEntries(["log", "info", "warn", "error", "debug"].map(name =>
      [name, (...args) => logs.push({ method: name, args })])) };
    assert.doesNotThrow(() => vm.runInNewContext(sample(id).en.source, context, { timeout: 500 }));
    assert.deepEqual(logs, sample(id).en.expected.consoleCalls);
  }
});


test("quiz grading is idempotent, freezes submitted answers, and navigation preserves progress", () => {
  let state = actual.quizCreate();
  assert.equal(actual.quizGrade(state), state);
  for (let index = 0; index < actual.QUESTIONS.length; index++) {
    state = actual.quizNavigate(state, index);
    state = actual.quizSelect(state, actual.QUESTIONS[index].answerId);
    assert.equal(actual.quizScore(state).answered, index);
    state = actual.quizGrade(state);
    assert.equal(actual.quizGrade(state), state);
    assert.equal(actual.quizSelect(state, "a"), state);
  }
  assert.deepEqual(actual.quizScore(state), { answered: 12, correct: 12, total: 12 });
  assert.equal(actual.quizNavigate(state, 0).answers["scope-safety"].graded, true);
  const wrong = actual.quizGrade(actual.quizSelect(actual.quizCreate(), "a"));
  assert.deepEqual(actual.quizScore(wrong), { answered: 1, correct: 0, total: 12 });
  assert.deepEqual(actual.quizScore(actual.quizCreate()), { answered: 0, correct: 0, total: 12 });
  assert.throws(() => actual.quizSelect(actual.quizCreate(), "missing"), RangeError);
  assert.throws(() => actual.quizNavigate(actual.quizCreate(), 12), RangeError);
});
