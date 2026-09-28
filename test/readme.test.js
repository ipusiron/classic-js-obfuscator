"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const core = require("../js/obfuscator-core.js");
const messages = require("../js/i18n.js").messages;
const expected = require("./fixtures/expect.json");

const root = path.join(__dirname, "..");
const documents = Object.fromEntries(["README.md", "README.en.md"].map((name) =>
  [name, fs.readFileSync(path.join(root, name), "utf8").replace(/\r\n/g, "\n")]));

const headingPairs = [
  [1, "Classic JS Obfuscator - 古典暗号JavaScript難読化ツール",
    "Classic JS Obfuscator - Classical Cipher JavaScript Obfuscation Tool"],
  [2, "🌐 デモページ", "🌐 Demo"],
  [2, "📸 スクリーンショット", "📸 Screenshots"],
  [2, "✨ 機能", "✨ Features"],
  [3, "🔐 暗号化機能", "🔐 Cipher features"],
  [3, "🎨 ユーザーインターフェイス", "🎨 User interface"],
  [3, "⚡ 便利機能", "⚡ Convenience features"],
  [3, "🛡️ セキュリティ対応", "🛡️ Security measures"],
  [2, "📋 使い方", "📋 Usage"],
  [3, "基本的な使い方", "Basic usage"],
  [3, "🎮 便利な機能の使い方", "🎮 Using the convenience features"],
  [3, "🧪 サンプルコードで動作確認（初回実験手順）", "🧪 Checking the sample (first experiment)"],
  [3, "生成物の利用とスコープ", "Using generated snippets and understanding scope"],
  [2, "⚠️ 注意", "⚠️ Cautions"],
  [3, "セキュリティに関する説明", "Security explanation"],
  [2, "🔬 技術・セキュリティ解説", "🔬 Technical and security guide"],
  [3, "参照サンプルの文字数とエントロピー", "Reference sample statistics and entropy"],
  [2, "🎯 実装済み機能", "🎯 Implemented features"],
  [3, "v1.0で実装された主要機能", "Main features implemented in v1.0"],
  [3, "将来の拡張予定", "Future extension ideas"],
  [2, "🧪 テスト", "🧪 Tests"],
  [2, "📁 ディレクトリー構造", "📁 Directory structure"],
  [2, "💻 動作環境", "💻 Requirements"],
  [3, "ローカルHTTPで開く方法", "Opening a local HTTP server"],
  [2, "📄 ライセンス", "📄 License"],
  [2, "🛠️ このツールについて", "🛠️ About this tool"],
];

function marked(source, name) {
  const start = `<!-- ${name}:start -->`;
  const end = `<!-- ${name}:end -->`;
  assert.equal(source.split(start).length, 2, `exactly one ${name} start marker`);
  assert.equal(source.split(end).length, 2, `exactly one ${name} end marker`);
  const first = source.indexOf(start) + start.length;
  const last = source.indexOf(end);
  assert.ok(last > first, `${name} marker order`);
  return source.slice(first, last).trim();
}

function codeBlock(source, name, language) {
  const section = marked(source, name);
  const prefix = "```" + language + "\n";
  assert.ok(section.startsWith(prefix) && section.endsWith("\n```"), `${name}: complete fenced block`);
  return section.slice(prefix.length, -4);
}

function actualInventory(directory = "") {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    if ([".git", ".claude"].includes(entry.name)) return [];
    const name = directory ? `${directory}/${entry.name}` : entry.name;
    return entry.isDirectory() ? [name + "/", ...actualInventory(name)] : [name];
  });
}

function imagePaths(source) {
  return [...source.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)].map((match) => match[1])
    .filter((target) => !/^(?:[a-z]+:|\/\/)/i.test(target));
}

test("Japanese README preserves the original YAML metadata bytes, keys and block lists", () => {
  const source = documents["README.md"];
  const metadata = source.match(/^<!--\n---\n[\s\S]*?\n---\n-->/)?.[0];
  assert.ok(metadata, "HTML-comment-wrapped YAML must remain at the beginning");
  const digest = crypto.createHash("sha256").update(metadata).digest("hex");
  // Normalized-LF metadata from the pre-improvement README at c254806.
  assert.equal(digest, "d819c0ef7d6c5d4b233f6bbe65ed7faa03e4a94ac45feac774eef35d7c60dc7f");
  const keys = [...metadata.matchAll(/^([a-z_]+):/gm)].map((match) => match[1]);
  assert.deepEqual(keys, [
    "id", "slug", "title", "subtitle_ja", "subtitle_en", "description_ja", "description_en",
    "category_ja", "category_en", "difficulty", "tags", "repo_url", "demo_url", "hub",
  ]);
  for (const key of ["category_ja", "category_en", "tags"]) {
    assert.match(metadata, new RegExp("^" + key + ":\\n(?:  - .+\\n)+", "m"));
  }
  assert.match(metadata, /^id: day042$/m);
  assert.match(metadata, /^slug: classic-js-obfuscator$/m);
  assert.match(metadata, /^repo_url: "https:\/\/github.com\/ipusiron\/classic-js-obfuscator"$/m);
  assert.match(metadata, /^demo_url: "https:\/\/ipusiron.github.io\/classic-js-obfuscator\/"$/m);
  assert.match(metadata, /^hub: true$/m);
  assert.doesNotMatch(documents["README.en.md"], /^id: day042$/m, "metadata belongs only in the Japanese README");
});

test("English and Japanese READMEs retain the complete heading correspondence", () => {
  assert.equal(headingPairs.length, 26, "the correspondence table must cover every section");
  for (const [name, languageIndex] of [["README.md", 1], ["README.en.md", 2]]) {
    const withoutCode = documents[name].replace(/```[\s\S]*?```/g, "");
    const headings = [...withoutCode.matchAll(/^(#{1,6}) (.+)$/gm)]
      .map((match) => [match[1].length, match[2]]);
    assert.deepEqual(headings, headingPairs.map((row) => [row[0], row[languageIndex]]), name);
  }
});

test("both READMEs retain series badges, language navigation and the 100-tool project link", () => {
  assert.match(documents["README.md"], /\[English\]\(README\.en\.md\) · 日本語/);
  assert.ok(documents["README.en.md"].startsWith("English · [日本語](README.md)\n"));
  assert.match(documents["README.md"], /\*\*Day042 - 生成AIで作るセキュリティツール100\*\*/);
  assert.match(documents["README.en.md"], /\*\*Day042 - 100 Security Tools with Generative AI\*\*/);
  for (const source of Object.values(documents)) {
    assert.equal([...source.matchAll(/https:\/\/img\.shields\.io\//g)].length, 5);
    assert.ok(source.includes("https://akademeia.info/?page_id=42163"));
    assert.ok(!source.includes("page_id=44607"));
  }
});

for (const [name, source] of Object.entries(documents)) {
  test(`${name}: sample and generated code match the reference and the implementation`, () => {
    const sample = codeBlock(source, "sample", "javascript");
    const snippet = codeBlock(source, "snippet", "javascript");
    assert.equal(sample, expected.sample);
    assert.equal(snippet, expected.sample_snippet_3);
    assert.equal(snippet, core.buildSnippet(sample, 3));
    assert.deepEqual(core.stats(sample, snippet), expected.sample_stats_3);
  });

  test(`${name}: numeric table is recalculated from the reference sample`, () => {
    const rows = marked(source, "stats").split("\n").slice(2);
    assert.equal(rows.length, 7, "all statistic rows must be parsed");
    const values = rows.map((row) => {
      const match = row.match(/^\| [^|]+ \| ([0-9]+(?:\.[0-9]+)?) \|$/);
      assert.ok(match, `unrecognized statistics row: ${row}`);
      return Number(match[1]);
    });
    const sample = codeBlock(source, "sample", "javascript");
    const statistics = core.stats(sample, core.buildSnippet(sample, 3));
    const entropy = [sample, core.caesarShift(sample, 3)].map((text) => Number(core.entropy(text).toFixed(4)));
    assert.deepEqual(entropy, expected.sample_entropy.map(Number));
    assert.deepEqual(values, [
      statistics.length, statistics.shifted, statistics.passed, statistics.snippetLength, statistics.ratio, ...entropy,
    ]);
    assert.equal(core.buildSnippet("", 3).length, expected.empty_stats.snippetLength);
    assert.ok(source.includes(String(expected.empty_stats.snippetLength)), "empty-input length must be documented");
    assert.equal(core.stats("", core.buildSnippet("", 3)).ratio, expected.empty_stats.ratio);
    const undefinedRatio = name === "README.md" ? `「${messages.ja.ratioUndefined}」` : `“${messages.en.ratioUndefined}”`;
    assert.ok(source.includes(undefinedRatio), "empty-input ratio text must agree with the interface");
  });

  test(`${name}: inventory describes every existing file and directory`, () => {
    const lines = codeBlock(source, "inventory", "text").split("\n");
    const entries = lines.map((line) => {
      const match = line.match(/^(\S+) +# (\S.*)$/);
      assert.ok(match, `every inventory line needs a path and description: ${line}`);
      return match[1];
    });
    assert.equal(new Set(entries).size, entries.length, "inventory entries must be unique");
    assert.equal(entries[0], "classic-js-obfuscator/");
    assert.equal(new Set(lines.map((line) => line.indexOf("#"))).size, 1, "description columns must align");
    assert.deepEqual(entries.slice(1).sort(), actualInventory().sort());
  });

  test(`${name}: all relative screenshot references point to real PNG images`, () => {
    const images = imagePaths(source);
    assert.ok(images.length > 0, "the screenshot section must contain relative image references");
    for (const image of images) {
      const bytes = fs.readFileSync(path.join(root, image));
      assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", image);
    }
  });
}

test("every screenshot asset is referenced and English screenshots have their own directory", () => {
  const referenced = new Set(Object.values(documents).flatMap(imagePaths));
  const assets = actualInventory().filter((name) => /^assets\/.*\.png$/i.test(name));
  assert.deepEqual([...referenced].sort(), assets.sort());
  assert.ok(imagePaths(documents["README.en.md"]).some((name) => name.startsWith("assets/en/")));
});

test("documented test commands use the built-in runner without npm dependencies", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(packageJson.scripts.test, "node --test");
  assert.equal(packageJson.engines.node, ">=22");
  assert.equal(Object.keys(packageJson.dependencies || {}).length, 0);
  assert.equal(Object.keys(packageJson.devDependencies || {}).length, 0);
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/test.yml"), "utf8");
  assert.match(workflow, /node-version: 22/);
  assert.match(workflow, /^  push:/m);
  assert.match(workflow, /^  pull_request:/m);
  assert.match(workflow, /run: npm test/);
  for (const source of Object.values(documents)) {
    assert.ok(source.includes("npm test"));
    assert.ok(source.includes("python -m http.server 8000 --bind 127.0.0.1"));
  }
});
