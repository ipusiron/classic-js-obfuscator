(function (root) {
  "use strict";

  const MAX_CODE_LENGTH = 2_000_000;
  const MAX_LOGS = 100;
  const MAX_TEXT_LENGTH = 4000;
  const TIMEOUT_MS = 5000;

  class SandboxRunner {
    static get supported() {
      return root.location.protocol === "http:" || root.location.protocol === "https:";
    }

    constructor({ host, onResult = () => {}, onState = () => {} }) {
      this.host = host;
      this.onResult = onResult;
      this.onState = onState;
      this.frame = null;
      this.runId = "";
      this.pendingCode = "";
      this.timer = null;
      this.started = false;
      this.running = false;
      this.logCount = 0;
      this.errorCount = 0;
      this.handleMessage = this.handleMessage.bind(this);
      root.addEventListener("message", this.handleMessage);
    }

    run(code) {
      this.reset();
      if (!SandboxRunner.supported) {
        this.onResult({ kind: "error", text: "unsupportedProtocol" });
        return false;
      }
      if (typeof code !== "string" || code.length > MAX_CODE_LENGTH) {
        this.onResult({ kind: "error", text: "codeTooLarge" });
        return false;
      }

      this.runId = typeof root.crypto.randomUUID === "function"
        ? root.crypto.randomUUID()
        : Array.from(root.crypto.getRandomValues(new Uint32Array(4)),
          (value) => value.toString(16).padStart(8, "0")).join("");
      this.pendingCode = code;
      this.running = true;
      const frame = root.document.createElement("iframe");
      frame.setAttribute("sandbox", "allow-scripts");
      frame.setAttribute("referrerpolicy", "no-referrer");
      frame.setAttribute("title", this.host.getAttribute("aria-label") || "Sandbox");
      frame.className = "sandbox-frame";
      const url = new URL("sandbox/runner.html", root.document.baseURI);
      url.hash = new URLSearchParams({ run: this.runId }).toString();
      frame.src = url.href;
      this.frame = frame;
      this.timer = root.setTimeout(() => {
        if (!this.running) return;
        this.reset();
        this.onResult({ kind: "timeout", text: "executionTimeout" });
      }, TIMEOUT_MS);
      this.host.appendChild(frame);
      this.onState("running");
      return true;
    }

    handleMessage(event) {
      const data = event.data;
      if (!this.frame || event.source !== this.frame.contentWindow || event.origin !== "null") return;
      if (!data || typeof data !== "object" || Array.isArray(data) || data.runId !== this.runId) return;

      if (data.type === "ready") {
        if (!this.running || this.started) return;
        this.started = true;
        // An opaque sandbox origin has no usable targetOrigin other than '*'.
        // The receiving window and run identifier still bind this to this frame.
        this.frame.contentWindow.postMessage({
          type: "run", runId: this.runId, code: this.pendingCode,
        }, "*");
        this.pendingCode = "";
        return;
      }
      if (!this.started) return;
      if (data.type === "done") {
        if (!this.running) return;
        this.finish();
        this.onResult({ kind: "done", text: "" });
        return;
      }
      if ((data.type !== "log" && data.type !== "error") || typeof data.text !== "string") return;
      if (data.type === "log" && this.logCount++ >= MAX_LOGS) return;
      if (data.type === "error" && this.errorCount++ >= MAX_LOGS) return;
      this.onResult({ kind: data.type, text: data.text.slice(0, MAX_TEXT_LENGTH) });
    }

    finish() {
      root.clearTimeout(this.timer);
      this.timer = null;
      this.pendingCode = "";
      this.running = false;
      this.onState("idle");
    }

    reset() {
      if (this.frame) this.frame.remove();
      this.frame = null;
      this.runId = "";
      this.started = false;
      this.logCount = 0;
      this.errorCount = 0;
      this.finish();
    }

    destroy() {
      this.reset();
      root.removeEventListener("message", this.handleMessage);
    }
  }

  root.SandboxRunner = SandboxRunner;
})(globalThis);
