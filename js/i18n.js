(function (root) {
  "use strict";

  // HTML below is a fixed, trusted dictionary. User code is never inserted here.
  const messages = {
    ja: {
      subtitle: "古典暗号で自己復号・自己実行するJavaScriptスニペットを生成",
      help: "📖 ヘルプ",
      tutorial: "❓ チュートリアル",
      themeLabel: "テーマを切り替える",
      languageLabel: "表示言語を英語に切り替える",
      helpClose: "ヘルプを閉じる",
      tutorialClose: "チュートリアルを閉じる",
      tabLabel: "暗号方式",
      caesar: "Caesar暗号",
      vigenere: "ビジュネル暗号（未実装）",
      vigenereNote: "ビジュネル暗号版は現在未実装です。",
      keyLabel: "🔑 シフト量（0〜94の整数）",
      generate: "難読化コードを生成",
      run: "この場で実行（テスト）",
      copy: "出力をコピー",
      download: ".js で保存",
      asciiNote: "※ ASCII 32〜126のみシフト対象。それ以外（日本語など）は変換せずに通過します。",
      runTitle: "実行結果",
      runHost: "隔離された実行画面",
      normal: "📄 通常表示",
      compare: "🔀 比較モード",
      inputLabel: "📝 元コード（JS）",
      outputLabel: "🧬 生成された難読化コード（実行可能）",
      warningTitle: "⚠️ セキュリティ上の注意",
      footer: "🔗 GitHubリポジトリはこちら：",
      noscript: "JavaScriptを有効にしてください。 / Please enable JavaScript.",
      stale: "入力や設定を変更しました。再生成してください。",
      initial: "入力とシフト量を指定し、コードを生成してください。",
      keyEmpty: "シフト量を入力してください。",
      keyInvalid: "0〜94の整数を半角数字で入力してください。",
      generated: "生成しました。出力は現在の入力に対応しています。",
      noop: "シフト0は文字を変換しません。出力は現在の入力に対応しています。",
      stats: "元コード {length}文字 → 生成物 {snippetLength}文字（文字数比 {ratio}）",
      ratioUndefined: "未定義",
      copySuccess: "コピーしました。",
      copyFail: "コピーできませんでした。選択した出力を手動でコピーしてください。",
      runNotice: "信頼できるコードだけを実行してください。実行画面は毎回初期化され、同期処理のログを表示します。",
      fileNotice: "ファイルを直接開いた場合は実行できません。HTTPで開くと実行できます。生成・コピー・保存は利用できます。",
      done: "実行完了",
      executionTimeout: "実行を終了しました。時間制限を超えました。",
      unsupportedProtocol: "実行にはHTTPまたはHTTPSでページを開いてください。",
      codeTooLarge: "コードが実行サイズの上限を超えています。",
      themeLight: "☀️ ライトモードに切り替えました。",
      themeDark: "🌙 ダークモードに切り替えました。",
      next: "次へ",
      previous: "前へ",
      complete: "完了",
      step: "ステップ {index}/{total}",
      sample: [
        "// サンプル：実行結果の欄に \"Hello Obfuscation!\" を表示する",
        "console.log(\"Hello Obfuscation!\");",
        "const p = document.createElement(\"p\");",
        "p.textContent = \"✅ 実行されました\";",
        "document.body.appendChild(p);"
      ].join("\n"),
      tour1: "<h3>📝 JavaScriptコードの入力</h3><p>難読化したいコードを入力します。</p>" +
        "<p>最初のサンプルで動作を試せます。信頼できないコードは実行しないでください。</p>",
      tour2: "<h3>🔑 シフト量の設定</h3><p><code>0〜94</code>の整数を指定します。初期値は<code>3</code>です。</p>" +
        "<p><code>0</code>は無変換です。大きな値にしても、安全性が高まるわけではありません。</p>",
      tour3: "<h3>🛠️ コード生成</h3><p>復号関数とペイロードを含む、自己復号・自己実行するIIFEを生成します。</p>" +
        "<p>入力、鍵、表示モード、言語を変えた場合は再生成してください。</p>",
      tour4: "<h3>🧬 生成結果</h3><p>生成物と文字数比を確認できます。空入力の文字数比は未定義です。</p>" +
        "<p>生成物は間接<code>eval</code>を使います。CSPとスコープの制約があり、任意の環境で動くとは限りません。</p>",
      tour5: "<h3>⚡ 実行・コピー・保存</h3><p>HTTP(S)では毎回新しいsandboxでテストします。</p>" +
        "<p>file://では生成・コピー・保存のみ利用できます。無限ループなどを安全に止められる保証はありません。</p>",
      tour6: "<h3>🔀 比較モード</h3><p>元コードと生成物を並べて確認できます。狭い画面では縦に並びます。</p>" +
        "<p>通常表示と入力は同期されます。表示を切り替えた後は再生成してください。</p>",
      warningHtml: [
        "<li>生成物は間接<code>eval</code>を呼びます。難読化は秘匿や安全性を保証せず、静的解析で復号できます。</li>",
        "<li>テストは親ページと分離したsandboxで実行します。信頼できるコードだけを実行してください。</li>",
        "<li>親DOM・Storageや通常のネットワーク通信を制限しますが、無限ループや自己遷移を含む完全な隔離は保証しません。</li>",
        "<li>ツールは入力を自動で保存・送信しません。言語とテーマだけをブラウザーに保存します。file://での実行は無効です。</li>"
      ].join(""),
      helpHtml: [
        "<h3>🛠️ Classic JS Obfuscatorについて</h3>",
        "<p>シーザー暗号によるJavaScriptの難読化を学ぶツールです。可読性を下げる仕組みを体験できますが、秘密の保護には使えません。</p>",
        "<h3>🔧 主な機能</h3><ul>",
        "<li>ASCII 32〜126の95文字をシフトし、それ以外の文字や改行はそのまま残します。</li>",
        "<li>復号関数とペイロードを含む、自己復号・自己実行するIIFEを生成します。</li>",
        "<li>通常表示・比較モード、コピー、.js保存、HTTP(S)での隔離テストに対応します。</li>",
        "<li>日本語・英語、ダーク・ライトの表示を選べます。ビジュネル暗号は未実装です。</li></ul>",
        "<h3>📝 使い方</h3><ol>",
        "<li>元コード欄にJavaScriptを入力します。最初のサンプルをそのまま使うこともできます。</li>",
        "<li>シフト量を半角数字の整数0〜94で指定します。空欄、小数、指数表記、負数は無効です。0は無変換です。</li>",
        "<li>「難読化コードを生成」を押し、出力と文字数比を確認します。空入力の比率は未定義です。</li>",
        "<li>出力をコピー・保存します。信頼できるコードに限り、HTTP(S)でテストできます。</li>",
        "<li>入力・鍵・表示モード・言語を変更すると出力が消えます。操作前に再生成してください。</li></ol>",
        "<h3>💡 技術仕様</h3><ul>",
        "<li>95文字の循環シフトです。ROT47は33〜126の94文字が対象なので別の方式です。シフト量を増やしても強固にはなりません。</li>",
        "<li>実行時に復号し、間接<code>eval</code>でグローバルスコープに評価します。ES Modulesのimport/exportには対応しません。</li>",
        "<li>非strictのvar・関数宣言とstrictコードではスコープの挙動が異なります。元コードと常に同じとは限りません。</li>",
        "<li>入力由来の文字列の&lt;はエスケープします。固定の復号関数には比較演算子&lt;が残ります。</li>",
        "<li>生成物の利用先ではCSPのeval制限を確認してください。任意のページへそのまま貼り付けて動くとは限りません。</li></ul>",
        "<h3>⚠️ セキュリティ上の注意</h3><div class=\"warning-box\"><h4>信頼できるコードだけを実行</h4><ul>",
        "<li>難読化は暗号学的な保護ではありません。復号関数と鍵も出力に含まれ、静的解析で元に戻せます。</li>",
        "<li>親ページはevalを使いません。実行専用iframeだけがCSPでevalを許可します。</li>",
        "<li>毎回新しいsandbox（allow-scriptsのみ）を作り、親DOM・Storage・通常のネットワーク通信を制限します。</li>",
        "<li>同期処理のログと例外を表示します。非同期処理の完了や完全な実行時間制限は保証しません。</li>",
        "<li>無限ループでタブが応答しなくなる場合があります。自己遷移なども含め、悪意あるコードの安全な実行環境ではありません。</li>",
        "<li>ツールは入力を自動で保存・送信しません。実行したコード自体の動作は別です。</li>",
        "<li>テーマと言語だけをlocalStorageへ保存し、保存が拒否されても動作します。</li>",
        "<li>file://はこのツールの方針として実行を無効にします。生成・コピー・保存は利用できます。</li></ul></div>",
        "<h3>🎨 インターフェース</h3><ul>",
        "<li>通常表示は縦並び、比較モードは広い画面で横並び・狭い画面で縦並びになります。</li>",
        "<li>テーマと言語は切り替えボタンで変更できます。言語はURLのlang、保存設定、ブラウザー設定の順で決まります。</li></ul>",
        "<h3>⌨️ キーボード操作</h3><ul>",
        "<li>Tabで操作対象を移動します。暗号方式タブは左右矢印、Home、Endでも切り替えられます。</li>",
        "<li>Escでヘルプやチュートリアルを閉じ、開いたボタンへ戻ります。</li></ul>",
        "<h3>🔗 関連リンク</h3><ul>",
        "<li><a href=\"https://github.com/ipusiron/classic-js-obfuscator\" target=\"_blank\" rel=\"noopener noreferrer\">GitHubリポジトリ</a></li>",
        "<li><a href=\"https://akademeia.info/?page_id=42163\" target=\"_blank\" rel=\"noopener noreferrer\">生成AIで作るセキュリティツール100</a></li></ul>",
        "<h3>📄 ライセンス</h3><p>MIT License。ライセンス条件に従って利用・改変できます。</p>"
      ].join("")
    },
    en: {
      subtitle: "Generate self-decoding, self-executing JavaScript snippets with a classical cipher",
      help: "📖 Help",
      tutorial: "❓ Tutorial",
      themeLabel: "Switch theme",
      languageLabel: "Switch display language to Japanese",
      helpClose: "Close help",
      tutorialClose: "Close tutorial",
      tabLabel: "Cipher method",
      caesar: "Caesar cipher",
      vigenere: "Vigenere cipher (not implemented)",
      vigenereNote: "The Vigenere cipher is not implemented yet.",
      keyLabel: "🔑 Shift (integer 0-94)",
      generate: "Generate obfuscated code",
      run: "Run here (test)",
      copy: "Copy output",
      download: "Save as .js",
      asciiNote: "Only ASCII 32-126 is shifted. All other characters, including non-Latin text, pass through unchanged.",
      runTitle: "Execution results",
      runHost: "Isolated execution view",
      normal: "📄 Normal view",
      compare: "🔀 Compare view",
      inputLabel: "📝 Original code (JS)",
      outputLabel: "🧬 Generated obfuscated code (executable)",
      warningTitle: "⚠️ Security notes",
      footer: "🔗 GitHub repository:",
      noscript: "Please enable JavaScript.",
      stale: "The input or settings changed. Generate the code again.",
      initial: "Enter code and a shift value, then generate the output.",
      keyEmpty: "Enter a shift value.",
      keyInvalid: "Enter an integer from 0 to 94 using ASCII digits.",
      generated: "Generated. The output matches the current input.",
      noop: "Shift 0 leaves characters unchanged. The output matches the current input.",
      stats: "Original: {length} characters → Output: {snippetLength} characters (size ratio: {ratio})",
      ratioUndefined: "undefined",
      copySuccess: "Copied.",
      copyFail: "Copy failed. Please copy the selected output manually.",
      runNotice: "Run trusted code only. Each run starts a fresh isolated view and displays synchronous logs.",
      fileNotice: "Execution is disabled for local files. Open via HTTP to run code. Generation, copying, and saving remain available.",
      done: "Execution complete",
      executionTimeout: "Execution ended because the time limit was exceeded.",
      unsupportedProtocol: "Open the page via HTTP or HTTPS to run code.",
      codeTooLarge: "The code exceeds the execution size limit.",
      themeLight: "☀️ Switched to light mode.",
      themeDark: "🌙 Switched to dark mode.",
      next: "Next",
      previous: "Previous",
      complete: "Finish",
      step: "Step {index}/{total}",
      sample: [
        "// Sample: display \"Hello Obfuscation!\" in the execution results",
        "console.log(\"Hello Obfuscation!\");",
        "const p = document.createElement(\"p\");",
        "p.textContent = \"✅ Code executed\";",
        "document.body.appendChild(p);"
      ].join("\n"),
      tour1: "<h3>📝 Enter JavaScript</h3><p>Enter the code you want to obfuscate.</p>" +
        "<p>You can try the prefilled sample. Never run code you do not trust.</p>",
      tour2: "<h3>🔑 Set the shift</h3><p>Use an integer from <code>0 to 94</code>. The default is <code>3</code>.</p>" +
        "<p><code>0</code> leaves characters unchanged. A larger shift does not provide stronger security.</p>",
      tour3: "<h3>🛠️ Generate code</h3><p>Create a self-decoding, self-executing IIFE containing the decoder and payload.</p>" +
        "<p>Generate again after changing the input, shift, view mode, or language.</p>",
      tour4: "<h3>🧬 Inspect the output</h3><p>Review the snippet and character-count ratio. The ratio is undefined for empty input.</p>" +
        "<p>The snippet uses indirect <code>eval</code>. CSP and scope restrictions mean it does not run in every environment.</p>",
      tour5: "<h3>⚡ Run, copy, and save</h3><p>HTTP(S) execution uses a fresh sandbox for each run.</p>" +
        "<p>With file://, only generation, copying, and saving are available. Infinite loops cannot be guaranteed to stop safely.</p>",
      tour6: "<h3>🔀 Compare view</h3><p>Compare source and output side by side, or vertically on narrow screens.</p>" +
        "<p>Both input fields stay synchronized. Generate the output again after switching views.</p>",
      warningHtml: [
        "<li>The snippet calls indirect <code>eval</code>. Obfuscation does not guarantee secrecy or safety; static analysis can decode it.</li>",
        "<li>Tests run in a sandbox separate from the parent page. Run trusted code only.</li>",
        "<li>Parent DOM, Storage, and ordinary network requests are restricted, but infinite loops and self-navigation are not fully isolated.</li>",
        "<li>The tool does not automatically save or send input. Only language and theme are saved. Execution is disabled with file://.</li>"
      ].join(""),
      helpHtml: [
        "<h3>🛠️ About Classic JS Obfuscator</h3>",
        "<p>Learn JavaScript obfuscation with a Caesar cipher. Explore how readability can be reduced; do not use it to protect secrets.</p>",
        "<h3>🔧 Features</h3><ul>",
        "<li>Shift the 95 characters in ASCII 32-126. All other characters and line breaks pass through unchanged.</li>",
        "<li>Generate a self-decoding, self-executing IIFE containing the decoder and payload.</li>",
        "<li>Use normal and comparison views, copy output, save a .js file, and test in isolation over HTTP(S).</li>",
        "<li>Choose Japanese or English and dark or light mode. Vigenere is not implemented.</li></ul>",
        "<h3>📝 How to use</h3><ol>",
        "<li>Enter JavaScript in the original-code field, or keep the prefilled sample.</li>",
        "<li>Enter an integer shift from 0 to 94 using ASCII digits. Blank, decimal, exponent, and negative values are invalid. 0 is a no-op.</li>",
        "<li>Choose Generate obfuscated code and inspect the output and character-count ratio. The ratio is undefined for empty input.</li>",
        "<li>Copy or save the output. Over HTTP(S), test it only if you trust the code.</li>",
        "<li>Changing the input, shift, view mode, or language clears the output. Generate it again before further actions.</li></ol>",
        "<h3>💡 Technical details</h3><ul>",
        "<li>This is a cyclic shift of 95 characters, not ROT47, which uses the 94 characters ASCII 33-126. A larger shift is not stronger.</li>",
        "<li>The payload is decoded and evaluated globally using indirect <code>eval</code>. ES Module import/export is not supported.</li>",
        "<li>Non-strict var and function declarations behave differently from strict code. Scope is not always identical to the original code.</li>",
        "<li>The &lt; characters in input-derived strings are escaped. The fixed decoder still contains comparison operators using &lt;.</li>",
        "<li>Check the destination page's CSP restrictions on eval. Pasting the snippet into an arbitrary page may not work.</li></ul>",
        "<h3>⚠️ Security notes</h3><div class=\"warning-box\"><h4>Run trusted code only</h4><ul>",
        "<li>Obfuscation is not cryptographic protection. The output contains the decoder and key, so static analysis can recover the source.</li>",
        "<li>The parent page does not use eval. Only the dedicated execution iframe permits eval in its CSP.</li>",
        "<li>Each run creates a fresh sandbox with allow-scripts only, restricting parent DOM, Storage, and ordinary network requests.</li>",
        "<li>Synchronous logs and errors are displayed. Completion of asynchronous work and strict execution time limits are not guaranteed.</li>",
        "<li>An infinite loop may freeze the tab. Self-navigation and other limitations mean this is not a safe environment for malicious code.</li>",
        "<li>The tool does not automatically save or send input. This does not guarantee the behavior of code you run.</li>",
        "<li>Only theme and language use localStorage, and the app works even when storage is blocked.</li>",
        "<li>This tool disables execution for file:// as a product policy. Generation, copying, and saving still work.</li></ul></div>",
        "<h3>🎨 Interface</h3><ul>",
        "<li>Normal view is vertical. Compare view is side by side on wide screens and vertical on narrow screens.</li>",
        "<li>Use the theme and language buttons. Initial language priority is the URL lang parameter, saved preference, then browser language.</li></ul>",
        "<h3>⌨️ Keyboard controls</h3><ul>",
        "<li>Use Tab to move between controls. Cipher tabs also support Left/Right arrows, Home, and End.</li>",
        "<li>Press Esc to close help or the tutorial and return focus to the button that opened it.</li></ul>",
        "<h3>🔗 Related links</h3><ul>",
        "<li><a href=\"https://github.com/ipusiron/classic-js-obfuscator\" target=\"_blank\" rel=\"noopener noreferrer\">GitHub repository</a></li>",
        "<li><a href=\"https://akademeia.info/?page_id=42163\" target=\"_blank\" rel=\"noopener noreferrer\">100 Security Tools with AI</a></li></ul>",
        "<h3>📄 License</h3><p>MIT License. You may use and modify the software under its license terms.</p>"
      ].join("")
    }
  };

  const bindings = [
    [".subtitle", "subtitle"],
    ["#help-btn, #help-title", "help"],
    ["#tutorial-btn", "tutorial"],
    ["#theme-toggle", "themeLabel", "aria-label"],
    ["#language-btn", "languageLabel", "aria-label"],
    ["#help-close", "helpClose", "aria-label"],
    ["#tutorial-close", "tutorialClose", "aria-label"],
    [".tabs", "tabLabel", "aria-label"],
    ["#tab-button-caesar", "caesar"],
    ["#tab-button-vigenere", "vigenere"],
    ["#tab-vigenere .placeholder-note", "vigenereNote"],
    ["label[for='key']", "keyLabel"],
    ["#btn-generate", "generate"],
    ["#btn-run", "run"],
    ["#btn-copy", "copy"],
    ["#btn-download", "download"],
    ["#ascii-note", "asciiNote"],
    ["#run-title", "runTitle"],
    ["#run-host", "runHost", "aria-label"],
    ["#btn-normal-view", "normal"],
    ["#btn-compare-view", "compare"],
    ["label[for='inputCode'], label[for='inputCodeCompare']", "inputLabel"],
    ["label[for='outputCode'], label[for='outputCodeCompare']", "outputLabel"],
    [".warn summary", "warningTitle"],
    ["#footer-label", "footer"],
    ["noscript", "noscript"],
    ["#tutorial-prev", "previous"],
    ["#tutorial-next", "next"],
    ["#help-body", "helpHtml", "html"],
    [".warn > ul", "warningHtml", "html"]
  ];

  let language = "ja";
  let initialized = false;

  function valid(value) {
    return value === "ja" || value === "en";
  }

  function t(key, params = {}) {
    const value = messages[language][key];
    if (typeof value !== "string") return key;
    return value.replace(/\{([a-zA-Z]+)\}/g, (match, name) =>
      Object.hasOwn(params, name) ? String(params[name]) : match);
  }

  function apply() {
    if (!root.document) return;
    root.document.documentElement.lang = language;
    for (const [selector, key, target] of bindings) {
      for (const element of root.document.querySelectorAll(selector)) {
        if (target === "html") element.innerHTML = t(key);
        else if (target) element.setAttribute(target, t(key));
        else element.textContent = t(key);
      }
    }
    const button = root.document.getElementById("language-btn");
    if (button) button.textContent = language === "ja" ? "EN" : "JA";
  }

  function setLanguage(value) {
    if (!valid(value) || language === value) return false;
    const previous = language;
    language = value;
    try { root.localStorage.setItem("language", language); } catch { /* Optional preference. */ }
    apply();
    if (root.dispatchEvent && root.CustomEvent) {
      root.dispatchEvent(new root.CustomEvent("languagechange", { detail: { previous, language } }));
    }
    return true;
  }

  function init() {
    if (initialized) return;
    initialized = true;
    let requested = null;
    let saved = null;
    try { requested = new URLSearchParams(root.location.search).get("lang"); } catch { /* No URL. */ }
    try { saved = root.localStorage.getItem("language"); } catch { /* Storage may be blocked. */ }
    language = valid(requested) ? requested : valid(saved) ? saved :
      /^ja(?:-|$)/i.test(root.navigator?.language || "") ? "ja" : "en";
    apply();
    const button = root.document?.getElementById("language-btn");
    if (button) button.addEventListener("click", () => setLanguage(language === "ja" ? "en" : "ja"));
  }

  const api = { messages, bindings, t, init, setLanguage, get language() { return language; } };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ObfuscatorI18n = api;
})(typeof globalThis === "object" ? globalThis : this);
