"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const editor = require("../js/editor-state.js");
const samples = require("../js/samples.js");

const fields = ["source", "key", "sampleId", "pristine", "sampleLanguage"];
const values = (state) => Object.fromEntries(fields.map((field) => [field, state[field]]));

test("creation selects the current-language basic sample, raw key 3 and no undo", () => {
  for (const language of ["ja", "en"]) {
    const state = editor.create(language);
    assert.deepEqual(state, {
      source: samples.get("basic", language).source,
      key: "3", sampleId: "basic", pristine: true, sampleLanguage: language, undo: null,
    });
    assert.deepEqual(Object.keys(state), [...fields, "undo"]);
    assert.equal(Object.isFrozen(state), true);
  }
});

test("loading any teaching sample replaces source and provenance but preserves every raw key", () => {
  for (const language of ["ja", "en"]) {
    for (const sample of samples.samples) {
      for (const key of ["003", "", " 3 ", "-1", "95", "1e2", "0", "94"]) {
        const original = editor.editKey(editor.editSource(editor.create(language), "custom"), key);
        const loaded = editor.load(original, sample.id, language);
        assert.equal(loaded.source, samples.get(sample.id, language).source);
        assert.equal(loaded.key, key);
        assert.equal(loaded.sampleId, sample.id);
        assert.equal(loaded.pristine, true);
        assert.equal(loaded.sampleLanguage, language);
        assert.deepEqual(loaded.undo, values(original));
        assert.equal(original.source, "custom");
        assert.equal(original.undo, null);
      }
    }
  }
});

test("manual source input always loses pristine status even when it spells the same sample", () => {
  const initial = editor.create("ja");
  const edited = editor.editSource(initial, initial.source);
  assert.equal(edited.source, initial.source);
  assert.equal(edited.pristine, false);
  assert.equal(edited.sampleId, "basic");
  assert.equal(edited.sampleLanguage, "ja");
  assert.equal(initial.pristine, true);
  assert.equal(editor.changeLanguage(edited, "en"), edited);
  assert.equal(editor.editSource(edited, edited.source), edited);
  const changedBack = editor.editSource(editor.editSource(initial, "other"), initial.source);
  assert.equal(changedBack.pristine, false);
  assert.equal(editor.changeLanguage(changedBack, "en").source, initial.source);
});

test("source edits preserve exact code units including CRLF and isolated surrogates", () => {
  const source = "text\r\n" + String.fromCharCode(0xD800) + String.fromCodePoint(0x1F600) + "e" + String.fromCharCode(0x301);
  const edited = editor.editSource(editor.create("ja"), source);
  const loaded = editor.load(edited, "unicode", "ja");
  const restored = editor.restore(loaded, "ja");
  assert.equal(edited.source, source);
  assert.equal(restored.source, source);
  assert.equal(editor.changeLanguage(restored, "en").source, source);
});

test("manual key changes never remove source pristine status or normalize the raw spelling", () => {
  const initial = editor.create("ja");
  const keyed = editor.editKey(initial, "003");
  assert.equal(keyed.source, initial.source);
  assert.equal(keyed.pristine, true);
  assert.equal(keyed.sampleId, "basic");
  assert.equal(keyed.key, "003");
  const translated = editor.changeLanguage(keyed, "en");
  assert.equal(translated.source, samples.get("basic", "en").source);
  assert.equal(translated.key, "003");
  assert.equal(translated.pristine, true);
  assert.equal(editor.editKey(translated, "003"), translated);
});

test("clear only empties the source and removes provenance while retaining the raw key", () => {
  const original = editor.editKey(editor.create("en"), " 003 ");
  const cleared = editor.clear(original);
  assert.deepEqual(values(cleared), {
    source: "", key: " 003 ", sampleId: null, pristine: false, sampleLanguage: null,
  });
  assert.deepEqual(cleared.undo, values(original));
  assert.deepEqual(Object.keys(cleared.undo), fields);
  assert.equal(Object.hasOwn(cleared.undo, "undo"), false);
  assert.equal(Object.isFrozen(cleared.undo), true);
  assert.equal(editor.changeLanguage(cleared, "ja"), cleared);
});

test("reset selects basic in the requested language and resets only the raw key to 3", () => {
  const original = editor.editKey(editor.load(editor.create("ja"), "scope", "ja"), "003");
  const reset = editor.reset(original, "en");
  assert.deepEqual(values(reset), {
    source: samples.get("basic", "en").source,
    key: "3", sampleId: "basic", pristine: true, sampleLanguage: "en",
  });
  assert.deepEqual(reset.undo, values(original));
  const sameLanguage = editor.reset(editor.editKey(editor.create("ja"), "003"), "ja");
  assert.equal(sameLanguage.key, "3");
  assert.equal(sameLanguage.undo.key, "003");
});

test("custom source and raw key 003 survive loading, language changes and one-step restore", () => {
  const original = editor.editKey(editor.editSource(editor.create("ja"), "custom\nsource"), "003");
  const loaded = editor.load(original, "scope", "ja");
  const translated = editor.changeLanguage(loaded, "en");
  assert.equal(translated.undo, loaded.undo);
  const restored = editor.restore(translated, "en");
  assert.deepEqual(values(restored), values(original));
  assert.equal(restored.undo, null);
  assert.equal(editor.changeLanguage(restored, "ja"), restored);
  assert.equal(editor.restore(restored, "ja"), restored);
});

test("same-language restore recovers pristine provenance and a later language change translates it", () => {
  const original = editor.editKey(editor.create("ja"), "003");
  const loaded = editor.load(original, "ascii-wrap", "ja");
  const restored = editor.restore(loaded, "ja");
  assert.deepEqual(values(restored), values(original));
  assert.equal(restored.undo, null);
  const translated = editor.changeLanguage(restored, "en");
  assert.equal(translated.sampleId, "basic");
  assert.equal(translated.pristine, true);
  assert.equal(translated.source, samples.get("basic", "en").source);
  assert.equal(translated.key, "003");
});

test("foreign-language pristine restore keeps saved text and converts provenance to custom", () => {
  const original = editor.editKey(editor.create("ja"), "003");
  const loaded = editor.load(original, "ascii-wrap", "ja");
  const translated = editor.changeLanguage(loaded, "en");
  const restored = editor.restore(translated, "en");
  assert.deepEqual(restored, {
    source: original.source, key: "003", sampleId: null, pristine: false, sampleLanguage: null, undo: null,
  });
  assert.equal(editor.changeLanguage(restored, "ja"), restored);
  assert.equal(editor.changeLanguage(restored, "en"), restored);
});

test("language changes follow the loaded sample ID and leave custom input and undo unchanged", () => {
  for (const sample of samples.samples) {
    const loaded = editor.load(editor.editKey(editor.create("ja"), "094"), sample.id, "ja");
    const translated = editor.changeLanguage(loaded, "en");
    assert.equal(translated.sampleId, sample.id);
    assert.equal(translated.source, sample.en.source);
    assert.equal(translated.sampleLanguage, "en");
    assert.equal(translated.key, "094");
    assert.equal(translated.undo, loaded.undo);
    assert.equal(Object.hasOwn(translated, "selectedSampleId"), false);
    assert.equal(editor.changeLanguage(translated, "en"), translated);
  }
});

test("no-op load, clear and reset preserve an existing undo snapshot", () => {
  const loaded = editor.load(editor.create("ja"), "scope", "ja");
  assert.equal(editor.load(loaded, "scope", "ja"), loaded);
  const cleared = editor.clear(loaded);
  assert.equal(editor.clear(cleared), cleared);
  const reset = editor.reset(editor.editSource(loaded, "custom"), "ja");
  assert.equal(editor.reset(reset, "ja"), reset);
  assert.equal(editor.restore(loaded, "ja").source, samples.get("basic", "ja").source);
  assert.equal(editor.restore(cleared, "ja").source, samples.get("scope", "ja").source);
  assert.equal(editor.restore(reset, "ja").source, "custom");
});

test("loading identical text is not a no-op when its provenance changes", () => {
  const initial = editor.create("ja");
  const edited = editor.editSource(initial, initial.source);
  const loaded = editor.load(edited, "basic", "ja");
  assert.notEqual(loaded, edited);
  assert.equal(loaded.source, edited.source);
  assert.equal(loaded.pristine, true);
  assert.deepEqual(loaded.undo, values(edited));
  const restored = editor.restore(loaded, "ja");
  assert.equal(restored.pristine, false);
  assert.equal(editor.changeLanguage(restored, "en").source, edited.source);
});

test("a shared-language sample body still changes provenance when its sample language changes", () => {
  const japanese = editor.load(editor.create("ja"), "unicode", "ja");
  const english = editor.load(japanese, "unicode", "en");
  assert.equal(english.source, japanese.source);
  assert.notEqual(english, japanese);
  assert.equal(english.sampleLanguage, "en");
  assert.deepEqual(english.undo, values(japanese));
});

test("only the last destructive input action is remembered and restore cannot redo", () => {
  const first = editor.load(editor.create("ja"), "scope", "ja");
  const second = editor.load(first, "unicode", "ja");
  assert.deepEqual(second.undo, values(first));
  assert.equal(Object.hasOwn(second.undo, "undo"), false);
  const restored = editor.restore(second, "ja");
  assert.equal(restored.sampleId, "scope");
  assert.equal(restored.undo, null);
  assert.equal(editor.restore(restored, "ja"), restored);
});

test("ordinary source and key edits do not replace the saved one-step snapshot", () => {
  const initial = editor.create("en");
  const loaded = editor.load(initial, "scope", "en");
  const edited = editor.editKey(editor.editSource(loaded, "custom"), "invalid");
  assert.equal(edited.undo, loaded.undo);
  assert.deepEqual(values(editor.restore(edited, "en")), values(initial));
});

test("restore consumes history even when current values already match the saved snapshot", () => {
  const original = editor.editSource(editor.create("ja"), "custom");
  const loaded = editor.load(original, "basic", "ja");
  const editedBack = editor.editSource(loaded, original.source);
  assert.deepEqual(values(editedBack), values(original));
  assert.notEqual(editedBack.undo, null);
  const restored = editor.restore(editedBack, "ja");
  assert.deepEqual(values(restored), values(original));
  assert.equal(restored.undo, null);
  assert.notEqual(restored, editedBack);
});

test("all transitions leave earlier states and their snapshots immutable", () => {
  const initial = editor.create("ja");
  const history = [initial];
  history.push(editor.load(history.at(-1), "scope", "ja"));
  history.push(editor.editSource(history.at(-1), "custom"));
  history.push(editor.editKey(history.at(-1), "003"));
  history.push(editor.clear(history.at(-1)));
  history.push(editor.reset(history.at(-1), "en"));
  history.push(editor.changeLanguage(history.at(-1), "ja"));
  history.push(editor.restore(history.at(-1), "ja"));
  for (const state of history) {
    const before = JSON.stringify(state);
    assert.equal(Object.isFrozen(state), true);
    assert.throws(() => { state.source = "changed"; }, TypeError);
    if (state.undo) {
      assert.equal(Object.isFrozen(state.undo), true);
      assert.throws(() => { state.undo.key = "changed"; }, TypeError);
    }
    editor.load(state, "console", "ja");
    editor.clear(state);
    editor.reset(state, "en");
    assert.equal(JSON.stringify(state), before);
  }
  assert.equal(initial.source, samples.get("basic", "ja").source);
  assert.equal(initial.key, "3");
  assert.equal(initial.undo, null);
});

test("invalid IDs, languages and text argument types are rejected without coercion or data leakage", () => {
  const initial = editor.create("ja");
  const trapped = new Proxy({}, { get() { throw new Error("Unexpected coercion"); } });
  for (const value of [null, undefined, 3, [], {}, new String("3"), Symbol("3"), trapped]) {
    assert.throws(() => editor.editSource(initial, value), { name: "TypeError", message: "invalidSource" });
    assert.throws(() => editor.editKey(initial, value), { name: "TypeError", message: "invalidKey" });
  }
  for (const id of ["missing", "__proto__", "constructor", null, {}, trapped]) {
    assert.throws(() => editor.load(initial, id, "ja"), { name: "RangeError", message: "invalidSample" });
  }
  for (const language of ["", "JA", "ja-JP", "fr", null, undefined, {}, trapped]) {
    for (const change of [
      () => editor.create(language), () => editor.load(initial, "basic", language),
      () => editor.reset(initial, language), () => editor.restore(initial, language),
      () => editor.changeLanguage(initial, language),
    ]) assert.throws(change, { name: "RangeError", message: "invalidLanguage" });
  }
  assert.equal(initial.undo, null);
});

test("classic-script editor transitions never execute source or access DOM, storage, URLs or network", () => {
  let effects = 0;
  const blocked = new Proxy({}, {
    get() {
      effects++;
      throw new Error("Unexpected side effect");
    },
  });
  const context = vm.createContext({
    document: blocked, localStorage: blocked, sessionStorage: blocked, location: blocked, console: blocked,
    fetch() { effects++; throw new Error("Unexpected network request"); },
    __editorExecuted: false,
  }, { codeGeneration: { strings: false, wasm: false } });
  for (const file of ["../js/obfuscator-core.js", "../js/samples.js", "../js/share-settings.js", "../js/editor-state.js"]) {
    vm.runInContext(fs.readFileSync(require.resolve(file), "utf8"), context, { timeout: 1000 });
  }
  assert.deepEqual(Object.keys(context.EditorState).sort(), Object.keys(editor).sort());
  const classic = context.EditorState;
  let state = classic.editSource(classic.create("ja"), "globalThis.__editorExecuted = true;");
  state = classic.editKey(state, "003");
  state = classic.load(state, "console", "ja");
  state = classic.changeLanguage(state, "en");
  state = classic.restore(state, "en");
  assert.equal(state.source, "globalThis.__editorExecuted = true;");
  assert.equal(state.key, "003");
  state = classic.clear(state);
  state = classic.reset(state, "en");
  assert.equal(state.source, samples.get("basic", "en").source);
  state = classic.applySettings(state, { sampleId: "unicode", shift: 3, language: "ja", view: "compare" });
  assert.equal(state.source, samples.get("unicode", "ja").source);
  assert.equal(context.__editorExecuted, false);
  assert.equal(effects, 0);
});

test("shared settings restore exact raw key and text across languages without restoring language or view", () => {
  for (const rawKey of ["", "003", "invalid", " 3 "]) {
    let state = editor.editKey(editor.create("ja"), rawKey);
    const original = state;
    state = editor.applySettings(state, { sampleId: "unicode", shift: 94, language: "en", view: "compare" });
    const applied = state;
    assert.equal(editor.applySettings(state, { sampleId: "unicode", shift: 94, language: "en", view: "normal" }), state);
    state = editor.restore(state, "en");
    assert.equal(state.source, original.source);
    assert.equal(state.key, rawKey);
    assert.equal(state.pristine, false);
    assert.equal(state.sampleId, null);
    assert.equal(state.undo, null);
    assert.equal(editor.changeLanguage(state, "ja"), state);
    assert.notEqual(applied.undo, null);
  }
});
