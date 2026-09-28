"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const controllerSource = fs.readFileSync(path.join(__dirname, "../js/sandbox-runner.js"), "utf8");
const runnerSource = fs.readFileSync(path.join(__dirname, "../sandbox/runner.js"), "utf8");

function controller(protocol = "https:") {
  const frames = [];
  const listeners = new Map();
  const timers = new Map();
  const results = [];
  const states = [];
  let sequence = 0;
  const host = {
    getAttribute: () => "Test results",
    appendChild: (frame) => frames.push(frame),
  };
  const context = vm.createContext({
    URL,
    URLSearchParams,
    crypto: { randomUUID: () => "run-" + ++sequence },
    location: { protocol },
    document: {
      baseURI: "https://example.test/tools/index.html",
      createElement: () => ({
        attributes: {},
        sent: [],
        contentWindow: { postMessage(data, origin) { this.sent = { data, origin }; } },
        setAttribute(name, value) { this.attributes[name] = value; },
        remove() { this.removed = true; },
      }),
    },
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type) => listeners.delete(type),
    setTimeout: (callback) => { timers.set(++sequence, callback); return sequence; },
    clearTimeout: (id) => timers.delete(id),
  });
  vm.runInContext(controllerSource, context, { timeout: 1000 });
  const runner = new context.SandboxRunner({
    host,
    onResult: (result) => results.push({ ...result }),
    onState: (state) => states.push(state),
  });
  function message(type, extra = {}, event = {}) {
    listeners.get("message")({
      source: runner.frame?.contentWindow,
      origin: "null",
      data: { type, runId: runner.runId, ...extra },
      ...event,
    });
  }
  return { context, runner, frames, results, states, timers, message };
}

test("sandbox controller creates a fresh opaque-origin iframe and completes the ready handshake", () => {
  const state = controller();
  assert.equal(state.runner.run("1 + 1;"), true);
  const frame = state.frames[0];
  assert.equal(frame.attributes.sandbox, "allow-scripts");
  assert.equal(frame.attributes.referrerpolicy, "no-referrer");
  assert.equal(new URL(frame.src).pathname, "/tools/sandbox/runner.html");
  state.message("ready");
  assert.equal(frame.contentWindow.sent.data.code, "1 + 1;");
  assert.equal(frame.contentWindow.sent.origin, "*");
  state.message("done");
  assert.equal(state.runner.running, false);
  assert.equal(state.timers.size, 0);
  assert.equal(frame.removed, undefined);
  assert.deepEqual(state.results, [{ kind: "done", text: "" }]);
  state.runner.run("2 + 2;");
  assert.equal(frame.removed, true);
  assert.notEqual(state.frames[1], frame);
});

test("sandbox controller rejects unrelated sources, origins, run identifiers and message types", () => {
  const state = controller();
  state.runner.run("1;");
  state.message("ready", {}, { source: {} });
  state.message("ready", {}, { origin: "https://example.test" });
  state.message("ready", { runId: "old-run" });
  assert.equal(state.runner.started, false);
  state.message("log", { text: "too early" });
  state.message("ready");
  state.message("unknown", { text: "ignored" });
  state.message("log", { text: {} });
  state.message("log", { text: "accepted" });
  assert.deepEqual(state.results, [{ kind: "log", text: "accepted" }]);
  state.runner.reset();
  state.message("log", { text: "after reset" });
  assert.equal(state.results.length, 1);
});

test("sandbox controller bounds messages and permits asynchronous error reports after completion", () => {
  const state = controller();
  state.runner.run("1;");
  state.message("ready");
  for (let index = 0; index < 110; index++) state.message("log", { text: "a".repeat(5000) });
  assert.equal(state.results.length, 100);
  assert.ok(state.results.every((result) => result.text.length === 4000));
  state.message("done");
  state.message("error", { text: "Error: asynchronous test" });
  assert.deepEqual(state.results.at(-1), { kind: "error", text: "Error: asynchronous test" });
});

test("sandbox controller rejects file URLs and oversized code, and removes timed-out frames", () => {
  const file = controller("file:");
  assert.equal(file.context.SandboxRunner.supported, false);
  assert.equal(file.runner.run("1;"), false);
  assert.equal(file.frames.length, 0);
  const state = controller();
  assert.equal(state.runner.run(" ".repeat(2_000_001)), false);
  state.runner.run("1;");
  [...state.timers.values()][0]();
  assert.equal(state.runner.frame, null);
  assert.equal(state.frames[0].removed, true);
  assert.equal(state.results.at(-1).kind, "timeout");
});

test("sandbox controller also creates identifiers on ordinary non-secure HTTP", () => {
  const state = controller("http:");
  delete state.context.crypto.randomUUID;
  state.context.crypto.getRandomValues = (values) => values.fill(123);
  assert.equal(state.runner.run("1;"), true);
  assert.equal(state.runner.runId.length, 32);
});

function child() {
  const messages = [];
  const listeners = new Map();
  const parent = { postMessage: (data, origin) => messages.push({ ...data, origin }) };
  const originalLog = () => {};
  const context = vm.createContext({
    URLSearchParams,
    location: { hash: "#run=test-run", origin: "https://example.test" },
    parent,
    console: { log: originalLog, info() {}, warn() {}, error() {}, debug() {} },
    addEventListener: (type, listener) => listeners.set(type, listener),
  });
  vm.runInContext(runnerSource, context, { timeout: 1000 });
  function execute(code, override = {}) {
    context.testMessage = {
      source: parent, origin: "https://example.test",
      data: { type: "run", runId: "test-run", code },
      ...override,
    };
    context.testListener = listeners.get("message");
    vm.runInContext("testListener(testMessage);", context, { timeout: 1000 });
  }
  return { context, messages, listeners, originalLog, execute };
}

test("sandbox child accepts only its parent and restores console after success or failure", () => {
  const success = child();
  success.execute("console.log('ignored');", { source: {} });
  success.execute("console.log('ignored');", { origin: "https://other.test" });
  assert.equal(success.messages.length, 1);
  success.execute("console.log('sample', { value: 1 });");
  assert.deepEqual(success.messages.map((message) => message.type), ["ready", "log", "done"]);
  assert.equal(success.messages[1].text, 'sample {"value":1}');
  assert.ok(success.messages.every((message) => message.origin === "https://example.test"));
  assert.equal(success.context.console.log, success.originalLog);
  success.execute("console.log('second run ignored');");
  assert.equal(success.messages.length, 3);

  const failure = child();
  failure.execute("throw new TypeError('sample error');");
  assert.equal(failure.messages[1].type, "error");
  assert.equal(failure.messages[1].text, "TypeError: sample error");
  assert.equal(failure.messages[2].type, "done");
  assert.equal(failure.context.console.log, failure.originalLog);
});

test("sandbox child formats circular data, caps output, and handles asynchronous error events", () => {
  const state = child();
  state.execute("var value = {}; value.self = value; console.log(value);" +
    "for (var i = 0; i < 110; i++) console.log('a'.repeat(5000));");
  const logs = state.messages.filter((message) => message.type === "log");
  assert.equal(logs[0].text, '{"self":"[Circular]"}');
  assert.equal(logs.length, 100);
  assert.ok(logs.every((message) => message.text.length <= 4000));
  let prevented = false;
  state.listeners.get("unhandledrejection")({
    reason: "asynchronous sample", preventDefault() { prevented = true; },
  });
  assert.equal(prevented, true);
  assert.equal(state.messages.at(-1).type, "error");
});

test("sandbox document limits dynamic evaluation to the isolated document", () => {
  const html = fs.readFileSync(path.join(__dirname, "../sandbox/runner.html"), "utf8");
  assert.match(html, /script-src 'self' 'unsafe-eval'/);
  for (const directive of ["connect-src", "object-src", "base-uri", "form-action", "frame-src"]) {
    assert.ok(html.includes(directive + " 'none'"), directive);
  }
  assert.doesNotMatch(html, /frame-ancestors|allow-same-origin|\son\w+=|\sstyle=/i);
});
