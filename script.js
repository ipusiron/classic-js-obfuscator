// Pure conversion logic is shared with the dependency-free Node tests.
const { buildSnippet: buildObfuscatedSnippet } = ObfuscatorCore;
const t = (key, params) => ObfuscatorI18n.t(key, params);

// UI まわり
function $(id) { return document.getElementById(id); }

// トースト通知を表示
function showToast(message, isError = false) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.classList.remove("error");
    }, 300);
  }, 2500);
}

let runner = null;
let outputSource = null;
let outputShift = null;

function invalidateOutput() {
  if (runner) runner.reset();
  $("run-result").textContent = "";
  outputSource = null;
  outputShift = null;
  $("outputCode").value = "";
  $("outputCodeCompare").value = "";
  $("output-stats").textContent = "";
  for (const id of ["btn-run", "btn-copy", "btn-download"]) $(id).disabled = true;
  $("output-status").textContent = t("stale");
}

function hasFreshOutput() {
  const key = ObfuscatorCore.parseShift($("key").value);
  return key.ok && outputSource === $("inputCode").value &&
    outputShift === key.value && $("outputCode").value !== "";
}

function init() {
  runner = new SandboxRunner({ host: $("run-host"), onResult: (result) => {
    if (result.kind === "log" || result.kind === "error") {
      const technicalKeys = ["unsupportedProtocol", "codeTooLarge"];
      const message = result.kind === "error" && technicalKeys.includes(result.text) ? t(result.text) : result.text;
      $("run-result").textContent += message + "\n";
    } else if (result.kind === "timeout") {
      $("run-result").textContent += t("executionTimeout") + "\n";
    } else if (result.kind === "done") {
      $("run-result").textContent += t("done") + "\n";
    }
  }, onState: (state) => {
    $("btn-run").disabled = state === "running" || !hasFreshOutput() || !SandboxRunner.supported;
  } });
  function renderRunNotice() {
    $("run-notice").textContent = t(SandboxRunner.supported ? "runNotice" : "fileNotice");
  }
  renderRunNotice();
  $("inputCode").value = t("sample");
  $("inputCodeCompare").value = $("inputCode").value;
  function validateKey() {
    const result = ObfuscatorCore.parseShift($("key").value);
    const message = result.ok ? "" : result.reason === "empty" ?
      t("keyEmpty") : t("keyInvalid");
    $("key-error").textContent = message;
    $("key-error").classList.toggle("show", !result.ok);
    $("key").setAttribute("aria-invalid", String(!result.ok));
    $("btn-generate").disabled = !result.ok;
    return result;
  }
  invalidateOutput();
  $("output-status").textContent = t("initial");
  validateKey();
  window.addEventListener("languagechange", () => {
    const source = $("inputCode").value;
    if (Object.values(ObfuscatorI18n.messages).some(messages => source === messages.sample)) {
      $("inputCode").value = t("sample");
      $("inputCodeCompare").value = $("inputCode").value;
    }
    invalidateOutput();
    validateKey();
    renderRunNotice();
    $("toast").textContent = "";
    $("toast").classList.remove("show");
  });
  $("key").addEventListener("input", () => {
    invalidateOutput();
    validateKey();
  });
  $("btn-generate").addEventListener("click", () => {
    const result = validateKey();
    if (!result.ok) return;
    runner.reset();
    $("run-result").textContent = "";
    const source = $("inputCode").value;
    const snippet = buildObfuscatedSnippet(source, result.value);
    $("outputCode").value = snippet;
    $("outputCodeCompare").value = snippet;
    outputSource = source;
    outputShift = result.value;
    const count = ObfuscatorCore.stats(source, snippet);
    $("output-stats").textContent =
      t("stats", { ...count, ratio: count.ratio === null ? t("ratioUndefined") : count.ratio + "%" });
    $("output-status").textContent = result.noop ?
      t("noop") : t("generated");
    for (const id of ["btn-copy", "btn-download"]) $(id).disabled = false;
    $("btn-run").disabled = !SandboxRunner.supported;
  });
  $("btn-copy").addEventListener("click", async () => {
    if (!hasFreshOutput()) return;
    const copiedSnippet = $("outputCode").value;
    const stillCurrent = () => hasFreshOutput() && $("outputCode").value === copiedSnippet;
    try {
      await navigator.clipboard.writeText(copiedSnippet);
      if (stillCurrent()) showToast(t("copySuccess"));
    } catch {
      // Settings or input may have changed while the permission request was pending.
      if (!stillCurrent()) return;
      const field = $("normal-view").classList.contains("active") ? $("outputCode") : $("outputCodeCompare");
      field.focus();
      field.select();
      let copied = false;
      try { copied = document.execCommand("copy"); } catch { /* Manual selection remains available. */ }
      showToast(t(copied ? "copySuccess" : "copyFail"), !copied);
    }
  });
  $("btn-download").addEventListener("click", () => {
    if (!hasFreshOutput()) return;
    const blob = new Blob([$("outputCode").value], { type: "application/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "obfuscated.js";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $("btn-run").addEventListener("click", () => {
    if (!hasFreshOutput() || !SandboxRunner.supported) return;
    $("run-result").textContent = "";
    $("btn-run").disabled = true;
    runner.run($("outputCode").value);
  });
}

// タブ切り替え機能
function initTabs() {
  const buttons = [...document.querySelectorAll(".tab-button")];
  function activate(button) {
    for (const tab of buttons) {
      const selected = tab === button;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      $(tab.dataset.tab).classList.toggle("active", selected);
    }
  }
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => activate(button));
    button.addEventListener("keydown", (event) => {
      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
      else if (event.key === "ArrowLeft") next = (index + buttons.length - 1) % buttons.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = buttons.length - 1;
      else return;
      event.preventDefault();
      activate(buttons[next]);
      buttons[next].focus();
    });
  });
}

// Dialog focus stays inside the active overlay and returns to its opener.
function openDialog(overlay, first) {
  overlay.returnFocus = document.activeElement;
  overlay.classList.add("active");
  for (const element of document.querySelectorAll("body > header, body > main, body > footer")) {
    element.inert = true;
  }
  document.body.classList.add("dialog-open");
  first.focus();
}

function closeDialog(overlay) {
  overlay.classList.remove("active");
  for (const element of document.querySelectorAll("body > header, body > main, body > footer")) {
    element.inert = false;
  }
  document.body.classList.remove("dialog-open");
  if (overlay.returnFocus?.isConnected) overlay.returnFocus.focus();
}

function trapDialogFocus(overlay, event) {
  if (event.key !== "Tab" || !overlay.classList.contains("active")) return;
  const buttons = [...overlay.querySelectorAll("button:not(:disabled), a[href], [tabindex='0']")]
    .filter(element => element.getClientRects().length);
  const first = buttons[0];
  const last = buttons[buttons.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

// 表示モード切り替え機能
function initViewMode() {
  const normalBtn = $("btn-normal-view");
  const compareBtn = $("btn-compare-view");
  const normalView = $("normal-view");
  const compareView = $("compare-view");

  const inputCode = $("inputCode");
  const outputCode = $("outputCode");
  const inputCodeCompare = $("inputCodeCompare");
  const outputCodeCompare = $("outputCodeCompare");

  // 表示モード切り替え
  function switchView(mode) {
    invalidateOutput();
    normalBtn.setAttribute("aria-pressed", String(mode === "normal"));
    compareBtn.setAttribute("aria-pressed", String(mode === "compare"));

    if (mode === "normal") {
      normalBtn.classList.add("active");
      compareBtn.classList.remove("active");
      normalView.classList.add("active");
      compareView.classList.remove("active");
    } else {
      normalBtn.classList.remove("active");
      compareBtn.classList.add("active");
      normalView.classList.remove("active");
      compareView.classList.add("active");

      // 比較モードに切り替え時、内容を同期
      inputCodeCompare.value = inputCode.value;
      outputCodeCompare.value = outputCode.value;
    }
  }

  // ボタンクリックイベント
  normalBtn.addEventListener("click", () => switchView("normal"));
  compareBtn.addEventListener("click", () => switchView("compare"));

  // 通常モードと比較モードの入力を同期
  inputCode.addEventListener("input", () => {
    inputCodeCompare.value = inputCode.value;
    invalidateOutput();
  });

  inputCodeCompare.addEventListener("input", () => {
    inputCode.value = inputCodeCompare.value;
    invalidateOutput();
  });

  // 出力の同期（生成ボタンクリック時に自動で同期されるため、ここでは読み取り専用）
}

// チュートリアル機能
function initTutorial() {
  const overlay = $("tutorial-overlay");
  const highlight = $("tutorial-highlight");
  const tooltip = $("tutorial-tooltip");
  const stepText = $("tutorial-step");
  const content = $("tutorial-content");
  const prevBtn = $("tutorial-prev");
  const nextBtn = $("tutorial-next");
  const closeBtn = $("tutorial-close");

  let currentStep = 0;

  const steps = [
    { element: "#inputCode", content: "tour1" },
    { element: "#key", content: "tour2" },
    { element: "#btn-generate", content: "tour3" },
    { element: "#outputCode", content: "tour4" },
    { element: ".field.inline", content: "tour5" },
    { element: "#btn-compare-view", content: "tour6" },
  ];
  stepText.textContent = t("step", { index: 1, total: steps.length });

  function showStep(index) {
    if (index < 0 || index >= steps.length) return;

    currentStep = index;
    const step = steps[index];

    // ステップ番号更新
    stepText.textContent = t("step", { index: index + 1, total: steps.length });

    // コンテンツ更新
    // Only trusted, bundled translation markup is inserted here.
    content.innerHTML = t(step.content);

    // ボタンの状態更新
    prevBtn.disabled = index === 0;
    nextBtn.textContent = t(index === steps.length - 1 ? "complete" : "next");

    const selector = step.element === "#inputCode" && $("compare-view").classList.contains("active")
      ? "#inputCodeCompare" : step.element === "#outputCode" && $("compare-view").classList.contains("active")
        ? "#outputCodeCompare" : step.element;
    const element = document.querySelector(selector);
    if (element) {
      element.scrollIntoView({ block: "center", behavior: "instant" });
      const rect = element.getBoundingClientRect();
      highlight.style.left = Math.max(0, rect.left - 4) + "px";
      highlight.style.top = Math.max(0, rect.top - 4) + "px";
      highlight.style.width = Math.min(rect.width + 8, innerWidth - 8) + "px";
      highlight.style.height = Math.min(rect.height + 8, innerHeight - 8) + "px";
      const box = tooltip.getBoundingClientRect();
      const left = Math.max(12, Math.min(rect.left, innerWidth - box.width - 12));
      const preferredTop = rect.bottom + 16 + box.height <= innerHeight - 12
        ? rect.bottom + 16 : rect.top - box.height - 16;
      const top = Math.max(12, Math.min(preferredTop, innerHeight - box.height - 12));
      tooltip.style.left = left + "px";
      tooltip.style.top = top + "px";
    }
  }

  function startTutorial() {
    $("tab-button-caesar").click();
    openDialog(overlay, closeBtn);
    showStep(0);
  }

  function endTutorial() {
    closeDialog(overlay);
  }

  // イベントリスナー
  nextBtn.addEventListener("click", () => {
    if (currentStep === steps.length - 1) {
      endTutorial();
    } else {
      showStep(currentStep + 1);
    }
  });

  prevBtn.addEventListener("click", () => {
    showStep(currentStep - 1);
  });

  closeBtn.addEventListener("click", () => {
    endTutorial();
  });

  // ESCキーで閉じる
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("active")) {
      endTutorial();
    }
  });

  overlay.addEventListener("keydown", event => trapDialogFocus(overlay, event));
  window.addEventListener("resize", () => {
    if (overlay.classList.contains("active")) showStep(currentStep);
  });

  window.addEventListener("languagechange", () => {
    stepText.textContent = t("step", { index: currentStep + 1, total: steps.length });
    content.innerHTML = t(steps[currentStep].content);
    nextBtn.textContent = t(currentStep === steps.length - 1 ? "complete" : "next");
    if (overlay.classList.contains("active")) showStep(currentStep);
  });

  // チュートリアルボタンのイベントリスナー
  const tutorialBtn = $("tutorial-btn");
  tutorialBtn.addEventListener("click", () => {
    startTutorial();
  });

  // 手動で開始する機能（コンソール用）
  window.startTutorial = startTutorial;
}

// テーマ切り替え機能
function initTheme() {
  const themeToggle = $("theme-toggle");
  const body = document.body;

  // 保存されたテーマを読み込み、なければダークモードをデフォルト
  let savedTheme = "dark";
  try { savedTheme = localStorage.getItem("theme") || "dark"; } catch { /* Optional setting. */ }

  function setTheme(theme) {
    if (theme === "light") {
      body.setAttribute("data-theme", "light");
      themeToggle.textContent = "🌙";
    } else {
      body.removeAttribute("data-theme");
      themeToggle.textContent = "☀️";
    }
    try { localStorage.setItem("theme", theme); } catch { /* Keep the in-memory setting. */ }
  }

  function toggleTheme() {
    const currentTheme = body.getAttribute("data-theme") === "light" ? "light" : "dark";
    const newTheme = currentTheme === "light" ? "dark" : "light";
    setTheme(newTheme);
    showToast(t(newTheme === "light" ? "themeLight" : "themeDark"));
  }

  // 初期テーマを設定
  setTheme(savedTheme);

  // クリックイベント
  themeToggle.addEventListener("click", toggleTheme);

  // 手動切り替え機能（コンソール用）
  window.setTheme = setTheme;
}

// ヘルプモーダル機能
function initHelp() {
  const helpBtn = $("help-btn");
  const helpModal = $("help-modal");
  const helpClose = $("help-close");

  function showHelp() {
    openDialog(helpModal, helpClose);
  }

  function hideHelp() {
    closeDialog(helpModal);
  }

  // イベントリスナー
  helpBtn.addEventListener("click", showHelp);
  helpClose.addEventListener("click", hideHelp);

  // モーダル外クリックで閉じる
  helpModal.addEventListener("click", (e) => {
    if (e.target === helpModal) {
      hideHelp();
    }
  });

  // ESCキーで閉じる
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && helpModal.classList.contains("active")) {
      hideHelp();
    }
  });

  helpModal.addEventListener("keydown", event => trapDialogFocus(helpModal, event));

  // 手動操作用
  window.showHelp = showHelp;
  window.hideHelp = hideHelp;
}

document.addEventListener("DOMContentLoaded", () => {
  ObfuscatorI18n.init();
  init();
  initTabs();
  initViewMode();
  initTutorial();
  initTheme();
  initHelp();

});
