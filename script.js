// Pure conversion logic is shared with the dependency-free Node tests.
const { buildSnippet: buildObfuscatedSnippet } = ObfuscatorCore;

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
  $("output-status").textContent = "入力や設定を変更しました。再生成してください。";
}

function hasFreshOutput() {
  const key = ObfuscatorCore.parseShift($("key").value);
  return key.ok && outputSource === $("inputCode").value &&
    outputShift === key.value && $("outputCode").value !== "";
}

function init() {
  runner = new SandboxRunner({ host: $("run-host"), onResult: (result) => {
    if (result.kind === "log" || result.kind === "error") {
      $("run-result").textContent += result.text + "\n";
    } else if (result.kind === "timeout") {
      $("run-result").textContent += "実行を終了しました。時間制限を超えました。\n";
    } else if (result.kind === "done") {
      $("run-result").textContent += "実行完了\n";
    }
  }, onState: (state) => {
    $("btn-run").disabled = state === "running" || !hasFreshOutput() || !SandboxRunner.supported;
  } });
  $("run-notice").textContent = SandboxRunner.supported ?
    "信頼できるコードだけを実行してください。実行画面は毎回初期化されます。" :
    "ファイルを直接開いた場合は実行できません。HTTPで開くと実行できます。生成・コピー・保存は利用できます。";
  $("inputCode").value = [
    "// サンプル：実行結果の欄に \"Hello Obfuscation!\" を表示する",
    "console.log(\"Hello Obfuscation!\");",
    "const p = document.createElement(\"p\");",
    "p.textContent = \"✅ 実行されました\";",
    "document.body.appendChild(p);",
  ].join("\n");
  function validateKey() {
    const result = ObfuscatorCore.parseShift($("key").value);
    const message = result.ok ? "" : result.reason === "empty" ?
      "シフト量を入力してください。" : "0〜94の整数を半角数字で入力してください。";
    $("key-error").textContent = message;
    $("key-error").classList.toggle("show", !result.ok);
    $("key").setAttribute("aria-invalid", String(!result.ok));
    $("btn-generate").disabled = !result.ok;
    return result;
  }
  invalidateOutput();
  $("output-status").textContent = "入力とシフト量を指定し、コードを生成してください。";
  validateKey();
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
      `元コード ${count.length}文字 → 生成物 ${count.snippetLength}文字（文字数比 ${count.ratio ?? "—"}%）`;
    $("output-status").textContent = result.noop ?
      "シフト0は文字を変換しません。出力は現在の入力に対応しています。" : "生成しました。出力は現在の入力に対応しています。";
    for (const id of ["btn-copy", "btn-download"]) $(id).disabled = false;
    $("btn-run").disabled = !SandboxRunner.supported;
  });
  $("btn-copy").addEventListener("click", async () => {
    if (!hasFreshOutput()) return;
    try {
      await navigator.clipboard.writeText($("outputCode").value);
      showToast("コピーしました。");
    } catch {
      const field = $("normal-view").classList.contains("active") ? $("outputCode") : $("outputCodeCompare");
      field.focus();
      field.select();
      if (document.execCommand("copy")) showToast("コピーしました。");
      else showToast("コピーできませんでした。選択した出力を手動でコピーしてください。", true);
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
    {
      element: "#inputCode",
      title: "ようこそ！",
      content: "<h3>📝 JavaScriptコードの入力</h3><p>ここに暗号化したいJavaScriptコードを入力します。</p><p>サンプルコードがすでに入力されているので、そのまま試すこともできます。</p>",
      position: "right"
    },
    {
      element: "#key",
      title: "シフト量の設定",
      content: "<h3>🔑 暗号化の鍵</h3><p>シーザー暗号のシフト量を<code>0〜94</code>の範囲で設定します。</p><p>デフォルトは<code>3</code>です。数値が大きいほど元のコードから離れた文字に変換されます。</p>",
      position: "bottom"
    },
    {
      element: "#btn-generate",
      title: "暗号化の実行",
      content: "<h3>🛠️ コード生成</h3><p>このボタンをクリックすると、入力したコードが暗号化されます。</p><p>生成されたコードは自己復号・自己実行可能なスニペットになります。</p>",
      position: "bottom"
    },
    {
      element: "#outputCode",
      title: "生成結果",
      content: "<h3>🧬 暗号化されたコード</h3><p>ここに生成された難読化コードが表示されます。</p><p>このコードは<code>&lt;script&gt;</code>タグ内にそのまま貼り付けて使用できます。</p>",
      position: "left"
    },
    {
      element: ".field.inline",
      title: "便利な機能",
      content: "<h3>⚡ アクション</h3><p><strong>テスト実行</strong>: 隔離した画面で動作確認</p>" +
        "<p><strong>コピー</strong>: クリップボードにコピー</p><p><strong>保存</strong>: .jsファイルとしてダウンロード</p>",
      position: "top"
    },
    {
      element: "#btn-compare-view",
      title: "比較モード",
      content: "<h3>🔀 並べて表示</h3><p>このボタンで比較モードに切り替えると、元のコードと暗号化後のコードを横並びで確認できます。</p><p>違いを視覚的に確認したい時に便利です。</p>",
      position: "bottom"
    }
  ];

  function showStep(index) {
    if (index < 0 || index >= steps.length) return;

    currentStep = index;
    const step = steps[index];

    // ステップ番号更新
    stepText.textContent = `Step ${index + 1}/${steps.length}`;

    // コンテンツ更新
    content.innerHTML = step.content;

    // ボタンの状態更新
    prevBtn.disabled = index === 0;
    nextBtn.textContent = index === steps.length - 1 ? "完了" : "次へ";

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
    showToast(`${newTheme === "light" ? "☀️ ライト" : "🌙 ダーク"}モードに切り替えました`);
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

  init();
  initTabs();
  initViewMode();
  initTutorial();
  initTheme();
  initHelp();

});
