(function () {
  "use strict";

  const runId = new URLSearchParams(location.hash.slice(1)).get("run");
  const parentOrigin = location.origin;
  const MAX_CODE_LENGTH = 2_000_000;
  const MAX_LOGS = 100;
  const MAX_TEXT_LENGTH = 4000;
  const postToParent = parent.postMessage.bind(parent);
  let started = false;
  let logCount = 0;
  let errorCount = 0;

  if (!runId || runId.length > 100 || !/^https?:\/\//.test(parentOrigin)) return;

  function send(type, text = "") {
    postToParent({ type, runId, text: text.slice(0, MAX_TEXT_LENGTH) }, parentOrigin);
  }

  function format(value) {
    try {
      if (typeof value === "string") return value.slice(0, MAX_TEXT_LENGTH);
      if (value === undefined) return "undefined";
      if (value instanceof Error) return (value.name + ": " + value.message).slice(0, MAX_TEXT_LENGTH);
      if (typeof value === "object" && value !== null) {
        const seen = new WeakSet();
        return JSON.stringify(value, (_key, item) => {
          if (typeof item === "bigint") return String(item);
          if (typeof item === "object" && item !== null) {
            if (seen.has(item)) return "[Circular]";
            seen.add(item);
          }
          return item;
        }).slice(0, MAX_TEXT_LENGTH);
      }
      return String(value).slice(0, MAX_TEXT_LENGTH);
    } catch {
      return "[Unprintable]";
    }
  }

  function reportError(error) {
    if (errorCount++ >= MAX_LOGS) return;
    send("error", format(error));
  }

  function captureLog(...values) {
    if (logCount++ >= MAX_LOGS) return;
    send("log", values.slice(0, MAX_LOGS).map(format).join(" "));
  }

  addEventListener("error", (event) => {
    if (!started) return;
    event.preventDefault();
    reportError(event.error || event.message);
  });

  addEventListener("unhandledrejection", (event) => {
    if (!started) return;
    event.preventDefault();
    reportError(event.reason);
  });

  addEventListener("message", (event) => {
    if (event.source !== parent || event.origin !== parentOrigin) return;
    const data = event.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) return;
    if (data.type !== "run" || data.runId !== runId || started) return;
    if (typeof data.code !== "string" || data.code.length > MAX_CODE_LENGTH) {
      send("error", "codeTooLarge");
      send("done");
      return;
    }

    started = true;
    const methods = ["log", "info", "warn", "error", "debug"];
    const originalMethods = new Map(methods.map((name) => [name, console[name]]));
    try {
      for (const name of methods) console[name] = captureLog;
      // User-provided code executes only inside this opaque-origin sandbox.
      (0, eval)(data.code);
    } catch (error) {
      reportError(error);
    } finally {
      for (const [name, method] of originalMethods) console[name] = method;
      send("done");
    }
  });

  send("ready");
})();
