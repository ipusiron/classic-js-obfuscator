/* Immutable editor transitions; selection, rendering, storage and execution stay in the UI. */
(function (root, factory) {
  "use strict";

  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./samples.js"), require("./share-settings.js"));
  } else {
    root.EditorState = factory(root.Samples, root.ShareSettings);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (samples, share) {
  "use strict";

  const fields = ["source", "key", "sampleId", "pristine", "sampleLanguage"];

  function requireLanguage(language) {
    if (language !== "ja" && language !== "en") throw new RangeError("invalidLanguage");
  }

  function requireString(value, reason) {
    if (typeof value !== "string") throw new TypeError(reason);
  }

  function snapshot(state) {
    return Object.freeze(Object.fromEntries(fields.map((field) => [field, state[field]])));
  }

  function makeState(values, undo) {
    return Object.freeze({ ...snapshot(values), undo });
  }

  function sameValues(left, right) {
    return fields.every((field) => left[field] === right[field]);
  }

  function update(state, values, remember = false) {
    if (sameValues(state, values)) return state;
    return makeState(values, remember ? snapshot(state) : state.undo);
  }

  function sampleValues(id, language, key) {
    requireLanguage(language);
    const sample = samples.get(id, language);
    if (!sample) throw new RangeError("invalidSample");
    return { source: sample.source, key, sampleId: id, pristine: true, sampleLanguage: language };
  }

  function create(language) {
    return makeState(sampleValues("basic", language, "3"), null);
  }

  function editSource(state, source) {
    requireString(source, "invalidSource");
    // An input event removes pristine status, even when its text matches a sample.
    return update(state, { ...snapshot(state), source, pristine: false });
  }

  function editKey(state, key) {
    requireString(key, "invalidKey");
    return update(state, { ...snapshot(state), key });
  }

  function load(state, id, language) {
    return update(state, sampleValues(id, language, state.key), true);
  }

  function clear(state) {
    return update(state, {
      source: "", key: state.key, sampleId: null, pristine: false, sampleLanguage: null,
    }, true);
  }

  function reset(state, language) {
    return update(state, sampleValues("basic", language, "3"), true);
  }

  function restore(state, language) {
    requireLanguage(language);
    if (!state.undo) return state;
    let values = state.undo;
    if (values.pristine && values.sampleLanguage !== language) {
      // Keep the saved source exactly; it must not be translated on a later language change.
      values = { ...values, sampleId: null, pristine: false, sampleLanguage: null };
    }
    // Consume the one-step snapshot even if the current text happens to match it.
    return makeState(values, null);
  }

  function changeLanguage(state, language) {
    requireLanguage(language);
    if (!state.pristine || state.sampleId === null) return state;
    return update(state, sampleValues(state.sampleId, language, state.key));
  }

  function applySettings(state, settings) {
    if (!settings || !Number.isInteger(settings.shift)) throw new RangeError("settings");
    const checked = share.create({ ...settings, rawKey: String(settings.shift) });
    if (!checked.ok) throw new RangeError("settings");
    return update(state, sampleValues(settings.sampleId, settings.language, String(settings.shift)), true);
  }

  return Object.freeze({ create, editSource, editKey, load, clear, reset, restore, changeLanguage, applySettings });
});
