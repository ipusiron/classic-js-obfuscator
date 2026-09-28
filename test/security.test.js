"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const core = require("../js/obfuscator-core.js");
const expected = require("./fixtures/expect.json");
const security = fs.readFileSync(path.join(__dirname, "../SECURITY.md"), "utf8");

test("the documented defensive detection patterns match the actual reference sample", () => {
  const block = security.match(/```regex\r?\n([\s\S]*?)\r?\n```/);
  assert.ok(block, "detection pattern examples exist");
  const patterns = block[1].split(/\r?\n/).filter(Boolean);
  assert.equal(patterns.length, 2);
  const expectedResults = [
    expected.security_regex_on_new.cand_iife_indirect_eval,
    expected.security_regex_on_new.cand_decoder,
  ];
  const snippet = core.buildSnippet(expected.sample, 3);
  for (const [index, pattern] of patterns.entries()) {
    assert.ok(pattern.startsWith("/") && pattern.endsWith("/"));
    assert.equal(new RegExp(pattern.slice(1, -1)).test(snippet), expectedResults[index]);
  }
});

test("the security guide statistics and entropy are calculated from the shipped core", () => {
  const snippet = core.buildSnippet(expected.sample, 3);
  const actual = core.stats(expected.sample, snippet);
  const rows = new Map([...security.matchAll(/^\| ([^|]+) \| ([^|]+) \|$/gm)]
    .map((match) => [match[1].trim(), match[2].trim()]));
  assert.equal(rows.get("元コードの文字数"), String(actual.length));
  assert.equal(rows.get("シフト対象の文字数"), String(actual.shifted));
  assert.equal(rows.get("シフト対象外の文字数"), String(actual.passed));
  assert.equal(rows.get("生成物の文字数"), String(actual.snippetLength));
  assert.equal(rows.get("生成物と元コードの文字数比"), actual.ratio.toFixed(1) + "%");
  assert.equal(rows.get("元コードのシャノンエントロピー"), core.entropy(expected.sample).toFixed(4) + " bit/文字");
  assert.equal(rows.get("シフト後文字列のシャノンエントロピー"),
    core.entropy(core.caesarShift(expected.sample, 3)).toFixed(4) + " bit/文字");
});
