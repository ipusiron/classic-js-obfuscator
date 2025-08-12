// --- Caesar 基本：ASCII 32–126 をシフト ---
function caesarEncrypt(text, shift) {
  console.group("🔐 Caesar暗号化処理");
  console.log("入力テキスト:", text);
  console.log("シフト量:", shift);
  
  const base = 32, span = 95; // 可視ASCII
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 32 && code <= 126) {
      const enc = ((code - base + (shift % span) + span) % span) + base;
      out += String.fromCharCode(enc);
      if (i < 5) { // 最初の5文字だけ詳細ログ
        console.log(`  文字 '${text[i]}' (${code}) → '${String.fromCharCode(enc)}' (${enc})`);
      }
    } else {
      out += text[i]; // それ以外は無変換で通す
    }
  }
  
  console.log("暗号化結果:", out.substring(0, 50) + (out.length > 50 ? "..." : ""));
  console.groupEnd();
  return out;
}

function caesarDecrypt(text, shift) {
  console.log("🔓 Caesar復号化: シフト量", -shift);
  return caesarEncrypt(text, -shift);
}

// 生成スニペット内に埋め込む復号関数（最少サイズ・可読性低め）
function runtimeDecryptFunctionSource() {
  // 文字列として埋め込むソース（IIFE内で const d = function(...){} として使う）
  return `function(t,s){const b=32,n=95;let o="";for(let i=0;i<t.length;i++){const c=t.charCodeAt(i);if(c>=32&&c<=126){const dec=((c-b-((s%n)+n)%n+n)%n)+b;o+=String.fromCharCode(dec);}else{o+=t[i];}}return o;}`;
}

// ダブルクォートの文字列に安全に埋め込むためのエスケープ
function escapeForDoubleQuotedJSString(s) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

function buildObfuscatedSnippet(originalCode, shift) {
  console.group("🛠️ 難読化スニペット生成");
  console.log("元コードサイズ:", originalCode.length, "文字");
  console.log("シフト量:", shift);
  
  // 1) ペイロードを暗号化
  const encrypted = caesarEncrypt(originalCode, shift);
  console.log("暗号化後サイズ:", encrypted.length, "文字");

  // 2) 復号関数のソースを埋め込み
  const decryptSrc = runtimeDecryptFunctionSource();
  console.log("復号関数サイズ:", decryptSrc.length, "文字");

  // 3) IIFE 生成（evalで自己実行）
  const snippet =
`(function(){
  const d = ${decryptSrc};
  const enc = "${escapeForDoubleQuotedJSString(encrypted)}";
  const sft = ${Number(shift) || 0};
  const dec = d(enc, sft);
  eval(dec);
})();`;

  console.log("最終スニペットサイズ:", snippet.length, "文字");
  console.log("圧縮率:", ((snippet.length / originalCode.length) * 100).toFixed(1) + "%");
  console.groupEnd();
  
  return snippet;
}

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

function init() {
  // サンプルをセット
  $("inputCode").value =
`// サンプル：ページに "Hello Obfuscation!" を表示
console.log("Hello Obfuscation!");
document.body.insertAdjacentHTML("beforeend", "<div style=\\"padding:8px;margin-top:8px;background:#0d1530;border:1px solid #23304f;border-radius:8px;color:#e8ecf1\\">✅ 実行されました</div>");`;

  // 出力依存ボタンの状態を更新
  function updateOutputButtons() {
    const hasOutput = $("outputCode").value.trim() !== "";
    $("btn-run").disabled = !hasOutput;
    $("btn-copy").disabled = !hasOutput;
    $("btn-download").disabled = !hasOutput;
  }

  // シフト量の検証
  function validateKey() {
    const keyInput = $("key");
    const errorMsg = $("key-error");
    const generateBtn = $("btn-generate");
    const key = Number(keyInput.value);
    
    if (isNaN(key) || key < 0 || key > 94 || !Number.isInteger(key)) {
      console.warn("⚠️ 無効なシフト量:", keyInput.value);
      errorMsg.innerHTML = "⚠️ 0〜94の整数を入力してください";
      errorMsg.classList.add("show");
      generateBtn.disabled = true;
      return false;
    } else {
      errorMsg.innerHTML = "";
      errorMsg.classList.remove("show");
      generateBtn.disabled = false;
      return true;
    }
  }

  // 初期状態をチェック
  validateKey();
  updateOutputButtons();

  $("key").addEventListener("input", validateKey);

  $("btn-generate").addEventListener("click", () => {
    console.group("🎯 生成ボタンクリック");
    
    if (!validateKey()) {
      console.log("❌ バリデーションエラー");
      console.groupEnd();
      return;
    }
    
    const key = Number($("key").value) || 0;
    const src = $("inputCode").value || "";
    
    console.log("入力コード長:", src.length, "文字");
    console.log("使用シフト量:", key);
    console.time("生成処理時間");
    
    const out = buildObfuscatedSnippet(src, key);
    
    console.timeEnd("生成処理時間");
    console.log("出力コード長:", out.length, "文字");
    
    $("outputCode").value = out;
    // 比較モードの出力も更新
    if ($("outputCodeCompare")) {
      $("outputCodeCompare").value = out;
      console.log("比較モードの出力も更新");
    }
    updateOutputButtons();
    
    console.log("✅ 生成完了");
    console.groupEnd();
  });

  $("btn-copy").addEventListener("click", async () => {
    const out = $("outputCode").value;
    if (!out) return;
    try {
      await navigator.clipboard.writeText(out);
      showToast("✅ コピーしました");
    } catch {
      showToast("❌ コピーに失敗しました。手動で選択してください。", true);
    }
  });

  $("btn-download").addEventListener("click", () => {
    const out = $("outputCode").value;
    if (!out) return;
    const blob = new Blob([out], { type: "application/javascript;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "obfuscated.js";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  });

  $("btn-run").addEventListener("click", () => {
    const out = $("outputCode").value;
    if (!out) return;
    
    console.group("🚀 テスト実行");
    console.log("実行するコード:");
    console.log(out.substring(0, 200) + (out.length > 200 ? "..." : ""));
    console.log("コードサイズ:", out.length, "文字");
    
    try {
      console.log("⏳ 実行開始...");
      console.time("実行時間");
      
      // そのまま eval（生成物の挙動確認）
      // 注意：教材用途。安全なコードでのみ実行してください。
      // eslint-disable-next-line no-eval
      eval(out);
      
      console.timeEnd("実行時間");
      console.log("✅ 実行成功");
    } catch (e) {
      console.timeEnd("実行時間");
      console.error("❌ 実行エラー:", e);
      alert("実行中にエラーが発生しました。コンソールを確認してください。");
    }
    
    console.groupEnd();
  });
}

// タブ切り替え機能
function initTabs() {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      const targetTab = button.getAttribute("data-tab");
      
      // すべてのタブボタンとコンテンツから active を除去
      tabButtons.forEach(btn => btn.classList.remove("active"));
      tabContents.forEach(content => content.classList.remove("active"));
      
      // クリックされたタブをアクティブに
      button.classList.add("active");
      const targetContent = document.getElementById(targetTab);
      if (targetContent) {
        targetContent.classList.add("active");
      }
    });
  });
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
    console.log(`📊 表示モード切替: ${mode}`);
    
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
      console.log("比較モードへデータ同期完了");
    }
  }

  // ボタンクリックイベント
  normalBtn.addEventListener("click", () => switchView("normal"));
  compareBtn.addEventListener("click", () => switchView("compare"));

  // 通常モードと比較モードの入力を同期
  inputCode.addEventListener("input", () => {
    inputCodeCompare.value = inputCode.value;
  });
  
  inputCodeCompare.addEventListener("input", () => {
    inputCode.value = inputCodeCompare.value;
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
      content: "<h3>⚡ アクション</h3><p><strong>テスト実行</strong>: その場でコードを実行して動作確認</p><p><strong>コピー</strong>: クリップボードにコピー</p><p><strong>保存</strong>: .jsファイルとしてダウンロード</p>",
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
    
    // ハイライトする要素の位置を取得
    const element = document.querySelector(step.element);
    if (element) {
      const rect = element.getBoundingClientRect();
      
      // ハイライト枠の位置設定
      highlight.style.left = rect.left - 5 + "px";
      highlight.style.top = rect.top - 5 + "px";
      highlight.style.width = rect.width + 10 + "px";
      highlight.style.height = rect.height + 10 + "px";
      
      // ツールチップの位置計算
      let tooltipLeft = rect.left;
      let tooltipTop = rect.top;
      
      switch(step.position) {
        case "right":
          tooltipLeft = rect.right + 20;
          tooltipTop = rect.top;
          break;
        case "left":
          tooltipLeft = rect.left - 370;
          tooltipTop = rect.top;
          break;
        case "bottom":
          tooltipLeft = rect.left;
          tooltipTop = rect.bottom + 20;
          break;
        case "top":
          tooltipLeft = rect.left;
          tooltipTop = rect.top - 250;
          break;
      }
      
      // 画面内に収まるよう調整
      const tooltipWidth = 400;
      const tooltipHeight = 250;
      
      if (tooltipLeft + tooltipWidth > window.innerWidth) {
        tooltipLeft = window.innerWidth - tooltipWidth - 20;
      }
      if (tooltipLeft < 20) {
        tooltipLeft = 20;
      }
      if (tooltipTop + tooltipHeight > window.innerHeight) {
        tooltipTop = rect.top - tooltipHeight - 20;
      }
      if (tooltipTop < 20) {
        tooltipTop = 20;
      }
      
      tooltip.style.left = tooltipLeft + "px";
      tooltip.style.top = tooltipTop + "px";
    }
  }
  
  function startTutorial() {
    overlay.classList.add("active");
    showStep(0);
    console.log("📚 チュートリアル開始");
  }
  
  function endTutorial() {
    overlay.classList.remove("active");
    console.log("✅ チュートリアル完了");
    showToast("チュートリアルを完了しました！");
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
    if (confirm("チュートリアルを終了しますか？")) {
      endTutorial();
    }
  });
  
  // ESCキーで閉じる
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("active")) {
      if (confirm("チュートリアルを終了しますか？")) {
        endTutorial();
      }
    }
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
  const savedTheme = localStorage.getItem("theme") || "dark";
  
  function setTheme(theme) {
    if (theme === "light") {
      body.setAttribute("data-theme", "light");
      themeToggle.textContent = "🌙";
      console.log("🌞 ライトモードに切り替え");
    } else {
      body.removeAttribute("data-theme");
      themeToggle.textContent = "☀️";
      console.log("🌙 ダークモードに切り替え");
    }
    localStorage.setItem("theme", theme);
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
    helpModal.classList.add("active");
    document.body.style.overflow = "hidden"; // 背景のスクロールを防止
    console.log("📖 ヘルプモーダル表示");
  }
  
  function hideHelp() {
    helpModal.classList.remove("active");
    document.body.style.overflow = ""; // スクロールを復元
    console.log("📖 ヘルプモーダル非表示");
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
  
  // 手動操作用
  window.showHelp = showHelp;
  window.hideHelp = hideHelp;
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("🌟 Classic JS Obfuscator 初期化開始");
  console.log("ブラウザ:", navigator.userAgent);
  
  init();
  initTabs();
  initViewMode();
  initTutorial();
  initTheme();
  initHelp();
  
  console.log("✅ 初期化完了");
  console.log("📋 使い方: 開発者ツールのコンソールで暗号化プロセスの詳細を確認できます");
  console.log("💡 チュートリアルを再度見るには: startTutorial() を実行");
  console.log("🎨 テーマ切り替え: setTheme('light') または setTheme('dark')");
  console.log("📖 ヘルプ表示: showHelp() を実行");
});
