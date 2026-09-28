"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

// Parse this project's static opening tags, including multiline attributes.
// This is deliberately not a browser parser; interaction checks run separately.
function readDocument(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  const markup = source.replace(/<!--[\s\S]*?-->/g, "");
  const elements = [];
  const tagPattern = /<([a-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi;
  const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const match of markup.matchAll(tagPattern)) {
    const attributes = new Map();
    for (const attribute of match[2].matchAll(attributePattern)) {
      attributes.set(attribute[1].toLowerCase(), attribute[2] ?? attribute[3] ?? attribute[4] ?? "");
    }
    elements.push({ tag: match[1].toLowerCase(), attributes });
  }
  return { source, markup, elements };
}

const page = readDocument("index.html");
const sandbox = readDocument("sandbox/runner.html");

function byId(id) {
  const element = page.elements.find((item) => item.attributes.get("id") === id);
  assert.ok(element, `missing #${id}`);
  return element;
}

function attribute(element, name) {
  return element.attributes.get(name);
}

function policy(document) {
  const metas = document.elements.filter((item) => item.tag === "meta" &&
    attribute(item, "http-equiv")?.toLowerCase() === "content-security-policy");
  assert.equal(metas.length, 1, "exactly one CSP meta");
  const directives = new Map();
  for (const text of attribute(metas[0], "content").split(";")) {
    const [name, ...values] = text.trim().split(/\s+/);
    if (!name) continue;
    assert.ok(!directives.has(name), `duplicate CSP directive ${name}`);
    directives.set(name, values);
  }
  return directives;
}

test("main document has UTF-8, a responsive viewport, one heading and unique identifiers", () => {
  assert.match(page.source, /^<!doctype html>/i);
  const html = page.elements.find((item) => item.tag === "html");
  assert.ok(["ja", "en"].includes(attribute(html, "lang")));
  assert.ok(page.elements.some((item) => item.tag === "meta" &&
    attribute(item, "charset")?.toLowerCase() === "utf-8"));
  assert.ok(page.elements.some((item) => item.tag === "meta" && attribute(item, "name") === "viewport" &&
    /width=device-width/.test(attribute(item, "content"))));
  assert.equal(page.elements.filter((item) => item.tag === "h1").length, 1);
  assert.ok(page.elements.some((item) => item.tag === "noscript"));
  const ids = page.elements.flatMap((item) => item.attributes.has("id") ? [attribute(item, "id")] : []);
  assert.equal(new Set(ids).size, ids.length, "IDs must not be duplicated");
});

test("parent CSP disallows dynamic evaluation and allows only the local execution frame", () => {
  const directives = policy(page);
  for (const name of ["default-src", "script-src", "style-src", "frame-src"]) {
    assert.deepEqual(directives.get(name), ["'self'"], name);
  }
  for (const name of ["object-src", "base-uri", "form-action", "connect-src"]) {
    assert.deepEqual(directives.get(name), ["'none'"], name);
  }
  assert.ok(!directives.has("frame-ancestors"), "frame-ancestors is not supported in meta CSP");
  assert.ok(![...directives.values()].flat().some((value) => /unsafe-eval|unsafe-inline/.test(value)));
  const childDirectives = policy(sandbox);
  assert.deepEqual(childDirectives.get("script-src"), ["'self'", "'unsafe-eval'"]);
  assert.deepEqual(childDirectives.get("default-src"), ["'none'"]);
  assert.ok(!childDirectives.has("frame-ancestors"));
});

test("both documents suppress referrers and contain no inline code or style attributes", () => {
  for (const document of [page, sandbox]) {
    assert.ok(document.elements.some((item) => item.tag === "meta" &&
      attribute(item, "name") === "referrer" && attribute(item, "content") === "no-referrer"));
    for (const element of document.elements) {
      for (const name of element.attributes.keys()) {
        assert.ok(!/^on/i.test(name), `${element.tag} has inline handler ${name}`);
        assert.notEqual(name, "style", `${element.tag} has an inline style`);
      }
    }
    assert.equal(document.elements.filter((item) => item.tag === "style").length, 0);
    for (const match of document.markup.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
      assert.equal(match[1].trim(), "", "script elements must load external assets");
    }
  }
});

test("scripts and styles resolve to existing local files without a build step", () => {
  for (const [relativePath, document] of [["index.html", page], ["sandbox/runner.html", sandbox]]) {
    const scripts = document.elements.filter((item) => item.tag === "script");
    assert.ok(scripts.length > 0, `${relativePath} must load its scripts`);
    const styles = document.elements.filter((item) => item.tag === "link" &&
      attribute(item, "rel") === "stylesheet");
    assert.ok(styles.length > 0, `${relativePath} must load its stylesheet`);
    for (const element of [...scripts, ...styles]) {
      const source = attribute(element, element.tag === "script" ? "src" : "href");
      assert.ok(source && !/^(?:[a-z]+:|\/\/)/i.test(source), `nonlocal asset ${source}`);
      const asset = path.resolve(root, path.dirname(relativePath), source);
      const relativeAsset = path.relative(root, asset);
      assert.ok(!relativeAsset.startsWith("..") && !path.isAbsolute(relativeAsset), source);
      assert.ok(fs.statSync(asset).isFile(), `missing asset ${source}`);
      if (element.tag === "script") {
        assert.ok(!attribute(element, "type") || attribute(element, "type") === "text/javascript",
          "classic scripts preserve direct-file generation support");
      }
    }
  }
  const sources = page.elements.filter((item) => item.tag === "script").map((item) => attribute(item, "src"));
  for (const expected of ["js/obfuscator-core.js", "js/sandbox-runner.js", "script.js"]) {
    assert.ok(sources.includes(expected), expected);
  }
  assert.ok(sources.indexOf("js/obfuscator-core.js") < sources.indexOf("script.js"));
  assert.ok(sources.indexOf("js/sandbox-runner.js") < sources.indexOf("script.js"));
  assert.ok(sources.includes("js/samples.js"));
  assert.ok(sources.includes("js/editor-state.js"));
  assert.ok(sources.includes("js/share-settings.js"));
  assert.ok(sources.indexOf("js/samples.js") < sources.indexOf("js/share-settings.js"));
  assert.ok(sources.indexOf("js/share-settings.js") < sources.indexOf("js/editor-state.js"));
  assert.ok(sources.indexOf("js/samples.js") < sources.indexOf("js/editor-state.js"));
  assert.ok(sources.indexOf("js/editor-state.js") < sources.indexOf("script.js"));
  assert.ok(sources.includes("js/learning-core.js"));
  assert.ok(sources.includes("js/learning-ui.js"));
  assert.ok(sources.indexOf("js/obfuscator-core.js") < sources.indexOf("js/learning-core.js"));
  assert.ok(sources.indexOf("js/learning-core.js") < sources.indexOf("js/learning-ui.js"));
  assert.ok(sources.indexOf("js/learning-ui.js") < sources.indexOf("script.js"));
  for (const [dependency, consumer] of [
    ["js/comparison-context.js", "js/learning-ui.js"],
    ["js/quiz-data.js", "js/quiz-core.js"],
    ["js/quiz-core.js", "js/quiz-ui.js"],
    ["js/quiz-ui.js", "script.js"],
    ["js/share-settings.js", "js/share-ui.js"],
    ["js/share-ui.js", "script.js"],
  ]) {
    assert.ok(sources.includes(dependency) && sources.includes(consumer));
    assert.ok(sources.indexOf(dependency) < sources.indexOf(consumer), `${dependency} before ${consumer}`);
  }
});

test("new-window links have explicit opener and referrer protection", () => {
  const links = page.elements.filter((item) => item.tag === "a" && attribute(item, "target") === "_blank");
  assert.ok(links.length > 0, "at least one external reference link is expected");
  for (const link of links) {
    const tokens = new Set((attribute(link, "rel") || "").split(/\s+/));
    assert.ok(tokens.has("noopener") && tokens.has("noreferrer"), attribute(link, "href"));
  }
});

test("tabs name their panels and expose exactly one initial keyboard selection", () => {
  const tablists = page.elements.filter((item) => attribute(item, "role") === "tablist");
  assert.equal(tablists.length, 1);
  const tabs = page.elements.filter((item) => attribute(item, "role") === "tab");
  const panels = page.elements.filter((item) => attribute(item, "role") === "tabpanel");
  assert.equal(tabs.length, 2);
  assert.equal(panels.length, 2);
  assert.equal(tabs.filter((item) => attribute(item, "aria-selected") === "true").length, 1);
  for (const name of ["caesar", "vigenere"]) {
    const tab = byId(`tab-button-${name}`);
    const panel = byId(`tab-${name}`);
    assert.equal(attribute(tab, "role"), "tab");
    assert.equal(attribute(panel, "role"), "tabpanel");
    assert.equal(attribute(tab, "aria-controls"), attribute(panel, "id"));
    assert.equal(attribute(panel, "aria-labelledby"), attribute(tab, "id"));
    const selected = attribute(tab, "aria-selected");
    assert.ok(["true", "false"].includes(selected));
    const defaultTabindex = tab.tag === "button" ? "0" : undefined;
    assert.equal(attribute(tab, "tabindex") ?? defaultTabindex, selected === "true" ? "0" : "-1");
  }
});

test("icon controls and modal dialogs have accessible names", () => {
  for (const id of ["theme-toggle", "help-close", "tutorial-close"]) {
    assert.ok(attribute(byId(id), "aria-label")?.trim(), `${id} needs an accessible label`);
  }
  const dialogs = page.elements.filter((item) => attribute(item, "role") === "dialog");
  assert.equal(dialogs.length, 2);
  for (const title of ["help-title", "tutorial-step"]) {
    const matching = dialogs.filter((item) => attribute(item, "aria-labelledby") === title);
    assert.equal(matching.length, 1, `one dialog labelled by ${title}`);
    assert.equal(attribute(matching[0], "aria-modal"), "true", title);
    byId(title);
  }
});

test("editable fields have labels, outputs are readonly, and action targets exist", () => {
  const labels = new Set(page.elements.filter((item) => item.tag === "label").map((item) => attribute(item, "for")));
  for (const element of page.elements.filter((item) => ["input", "textarea", "select"].includes(item.tag))) {
    assert.ok(labels.has(attribute(element, "id")), `missing label for ${attribute(element, "id")}`);
  }
  for (const id of ["outputCode", "outputCodeCompare", "share-url"]) assert.ok(byId(id).attributes.has("readonly"), id);
  for (const id of [
    "key", "inputCode", "inputCodeCompare", "btn-generate", "btn-run", "btn-copy", "btn-download",
    "btn-normal-view", "btn-compare-view", "normal-view", "compare-view", "help-btn", "tutorial-btn",
    "tutorial-prev", "tutorial-next", "tutorial-overlay", "help-modal", "output-stats", "run-notice", "run-title",
    "sample-select", "btn-load-sample", "btn-clear-input", "btn-reset-input", "btn-restore-input", "sample-state",
    "inspect-input", "inspect-source", "btn-inspect-load", "btn-inspect", "btn-inspect-clear",
  ]) byId(id);
  assert.equal(attribute(byId("key"), "aria-describedby"), "key-error");
});

test("validation, notifications and execution results expose live announcements", () => {
  for (const id of ["key-error", "toast", "output-status", "sample-state", "lab-status", "inspect-status"]) {
    assert.equal(attribute(byId(id), "role"), "status", id);
  }
  assert.equal(attribute(byId("run-result"), "role"), "log");
  assert.equal(attribute(byId("run-result"), "aria-live"), "polite");
  assert.ok(attribute(byId("run-host"), "aria-label")?.trim());
  assert.equal(byId("inspect-source").tag, "pre");
  assert.equal(attribute(byId("inspect-source"), "aria-readonly"), "true");
});

test("restored text keeps wrapping and bidi isolation without large-plaintext layout regressions", () => {
  const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
  const restored = css.match(/\.inspect-source\s*\{([^}]+)\}/)?.[1];
  assert.ok(restored);
  assert.match(restored, /unicode-bidi:\s*isolate\s*;/);
  assert.match(restored, /direction:\s*ltr\s*;/);
  assert.match(restored, /white-space:\s*pre-wrap\s*;/);
  assert.match(restored, /overflow-wrap:\s*anywhere\s*;/);
  assert.match(restored, /max-height:/);
});
