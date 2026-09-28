/* Allowlisted settings only. Never accept source code or use the current URL as a base. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./obfuscator-core.js"), require("./samples.js"));
  } else root.ShareSettings = factory(root.ObfuscatorCore, root.Samples);
})(typeof globalThis !== "undefined" ? globalThis : this, function (core, samples) {
  "use strict";

  const BASE = "https://ipusiron.github.io/classic-js-obfuscator/";
  const LIMIT = 200;
  const sampleIds = Object.freeze(samples.samples.map((sample) => sample.id));
  const fail = (reason) => ({ ok: false, reason });

  function parse(hash) {
    if (typeof hash !== "string") return fail("notString");
    if (!hash.startsWith("#cjo=")) return { ok: true, kind: "none" };
    if (hash.length > LIMIT) return fail("tooLarge");
    const parts = hash.slice(1).split("&");
    const required = ["cjo", "sample", "key", "lang", "view"];
    if (parts.length !== required.length) return fail("fields");
    const values = Object.create(null);
    for (const part of parts) {
      const pair = part.split("=");
      if (pair.length !== 2 || !required.includes(pair[0]) || Object.hasOwn(values, pair[0])) return fail("fields");
      values[pair[0]] = pair[1];
    }
    if (values.cjo !== "v1") return fail("version");
    if (!sampleIds.includes(values.sample)) return fail("sample");
    if (!/^(?:[0-9]|[1-8][0-9]|9[0-4])$/.test(values.key)) return fail("key");
    if (values.lang !== "ja" && values.lang !== "en") return fail("language");
    if (values.view !== "normal" && values.view !== "compare") return fail("view");
    return { ok: true, kind: "settings", settings: {
      sampleId: values.sample, shift: Number(values.key), language: values.lang, view: values.view,
    } };
  }

  function create({ sampleId, rawKey, language, view }) {
    if (typeof rawKey !== "string") return fail("key");
    const parsed = core.parseShift(rawKey);
    if (!parsed.ok) return fail("key");
    if (!sampleIds.includes(sampleId)) return fail("sample");
    if (language !== "ja" && language !== "en") return fail("language");
    if (view !== "normal" && view !== "compare") return fail("view");
    const hash = `#cjo=v1&sample=${sampleId}&key=${parsed.value}&lang=${language}&view=${view}`;
    return { ok: true, hash, url: BASE + hash, settings: parse(hash).settings };
  }

  return Object.freeze({ BASE, LIMIT, sampleIds, parse, create });
});
