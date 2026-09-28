"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

function collect(directory) {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) return collect(relativePath);
    return /\.(?:js|css|html)$/.test(entry.name) ? [relativePath] : [];
  });
}

// Reference JSON intentionally contains exact generated snippets. Documentation
// is checked separately when the documentation stage updates those files.
const sourcePaths = [
  "index.html", "script.js", "style.css", "package.json", ".github/workflows/test.yml",
  ".github/workflows/browser.yml", "test/browser/smoke.py", "test/browser/requirements.txt",
  ...collect("js"), ...collect("sandbox"), ...collect("test"),
];

test("maintained source is valid UTF-8 with a final newline and no trailing whitespace", () => {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const failures = [];
  for (const relativePath of sourcePaths) {
    const bytes = fs.readFileSync(path.join(root, relativePath));
    assert.notEqual(bytes.subarray(0, 3).toString("hex"), "efbbbf", `${relativePath}: unexpected BOM`);
    const source = decoder.decode(bytes);
    if (!source.endsWith("\n")) failures.push(`${relativePath}: missing final newline`);
    if (/\r(?!\n)/.test(source)) failures.push(`${relativePath}: bare carriage return`);
    source.replace(/\r\n/g, "\n").split("\n").forEach((line, index) => {
      if (/[\t ]+$/.test(line)) failures.push(`${relativePath}:${index + 1}: trailing whitespace`);
    });
  }
  assert.deepEqual(failures, []);
});

test("JavaScript and CSS lines stay within 160 characters, HTML within 250", () => {
  const failures = [];
  for (const relativePath of sourcePaths) {
    if (!/\.(?:js|css|html)$/.test(relativePath)) continue;
    const limit = relativePath.endsWith(".html") ? 250 : 160;
    const lines = fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n").split("\n");
    lines.forEach((line, index) => {
      const length = [...line].length;
      if (length > limit) failures.push(`${relativePath}:${index + 1}: ${length} characters (maximum ${limit})`);
    });
  }
  assert.deepEqual(failures, []);
});

test("major source files retain readable line counts instead of whole-file minification", () => {
  const minimumLines = {
    "index.html": 150,
    "script.js": 120,
    "style.css": 150,
    "js/obfuscator-core.js": 80,
    "js/sandbox-runner.js": 90,
    "sandbox/runner.js": 60,
  };
  for (const [relativePath, minimum] of Object.entries(minimumLines)) {
    const source = fs.readFileSync(path.join(root, relativePath), "utf8");
    const lineCount = source.trimEnd().split(/\r?\n/).length;
    assert.ok(lineCount >= minimum, `${relativePath}: ${lineCount} lines; expected at least ${minimum}`);
  }
});
