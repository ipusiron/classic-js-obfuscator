<!--
---
id: day042
slug: classic-js-obfuscator

title: "Classic JS Obfuscator"

subtitle_ja: "古典暗号JavaScript難読化ツール"
subtitle_en: "Classical Cipher JavaScript Obfuscation Tool"

description_ja: "シーザー暗号を使用してJavaScriptコードを難読化し、自己復号・自己実行可能なスニペットを生成するWebツール"
description_en: "A web tool that obfuscates JavaScript code using Caesar cipher and generates self-decrypting, self-executing snippets"

category_ja:
  - 難読化
  - 古典暗号
category_en:
  - Obfuscation
  - Classical Cryptography

difficulty: 2

tags:
  - javascript
  - caesar-cipher
  - obfuscation
  - web-tool

repo_url: "https://github.com/ipusiron/classic-js-obfuscator"
demo_url: "https://ipusiron.github.io/classic-js-obfuscator/"

hub: true
---
-->

# Classic JS Obfuscator - 古典暗号JavaScript難読化ツール

[English](README.en.md) · 日本語

![GitHub Repo stars](https://img.shields.io/github/stars/ipusiron/classic-js-obfuscator?style=social)
![GitHub forks](https://img.shields.io/github/forks/ipusiron/classic-js-obfuscator?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/ipusiron/classic-js-obfuscator)
![GitHub license](https://img.shields.io/github/license/ipusiron/classic-js-obfuscator)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://ipusiron.github.io/classic-js-obfuscator/)

**Day042 - 生成AIで作るセキュリティツール100**

**Classic JS Obfuscator** は、古典暗号（シーザー暗号）で暗号化されたJavaScriptスニペットを生成するWebツールです。
復号関数＋`eval`を同梱しているため、**自己復号・自己実行可能な** JavaScriptスニペットになります。

UIは2つのタブ構成になっており、現在はシーザー暗号版が実装済み、ビジュネル暗号版は未実装です。
画面内の実行は親ページと隔離したsandbox iframeで行います。信頼できるサンプルの学習用であり、秘密情報の保護や不審なコードの安全性判定には使えません。

---

## 🌐 デモページ

👉 [https://ipusiron.github.io/classic-js-obfuscator/](https://ipusiron.github.io/classic-js-obfuscator/)

---

## 📸 スクリーンショット

> ![日本語の比較モード、ライトテーマ](assets/screenshot.png)
>
> *日本語の比較モードでサンプルの入力と生成物を表示したライトテーマ*

> ![日本語の比較モード、ダークテーマ](assets/screenshot2.png)
>
> *同じサンプルと比較モードを表示したダークテーマ*

> ![英語の比較モード、ライトテーマ](assets/en/screenshot.png)
>
> *英語に切り替えた比較モードのライトテーマ*

---

## ✨ 機能

### 🔐 暗号化機能

- **シーザー暗号による暗号化**：ASCII可視範囲（32〜126）の95文字をシフト
- **自己復号スニペット生成**：復号関数と暗号化済みペイロードを同梱したIIFE形式
- **シフト量設定**：0〜94の整数を指定。0は無変換であり、値の大小は暗号強度を表さない
- **出力コード**：実行先のCSPとスコープの条件を確認して利用するJavaScript

### 🎨 ユーザーインターフェイス

- **比較モード**：元コードと暗号化後のコードを横並びで表示
- **ダークモード/ライトモード**：テーマ切り替え
- **チュートリアル**：6ステップの操作ガイド
- **ヘルプモーダル**：使い方とセキュリティ情報
- **トースト通知**：コピー成功など操作結果の通知
- **日英切り替え**：ヘルプ、エラー、チュートリアルを含む日本語・英語表示

### ⚡ 便利機能

- **その場でテスト実行**：HTTP/HTTPSで開いた場合のsandbox内実行
- **ワンクリックコピー**：クリップボードへのコピーと、利用できない場合の選択コピー
- **ダウンロード機能**：`.js`ファイルとしての保存
- **レスポンシブデザイン**：モバイル・デスクトップ両対応
- **入力バリデーション**：空欄、小数、指数表記、全角数字、負数、95以上の鍵を拒否
- **出力の更新管理**：入力・鍵・表示モード・言語を変えた場合の出力クリアと再生成案内

鍵の前後の空白は除去し、先頭の0は許可します。空欄とシフト0は区別します。

### 🛡️ セキュリティ対応

- **クライアント側の変換**：入力コードの送信・保存を行わない変換処理
- **実行の隔離**：`sandbox="allow-scripts"`を付けたiframeと、親子で分けたCSP
- **実行結果の表示**：同期ログと例外を`textContent`で表示
- **保存設定の限定**：テーマと言語だけをlocalStorageに保存し、保存不可でも処理を継続
- **教育目的設計**：難読化とsandboxの限界を画面・文書に表示

---

## 📋 使い方

### 基本的な使い方

1. **コード入力**：「元コード」欄に信頼できるJavaScriptを入力する。
2. **シフト量設定**：0〜94の整数を指定する。初期値は3である。
3. **暗号化実行**：「難読化コードを生成」ボタンを押す。
4. **結果活用**：生成されたコードをコピー・保存し、HTTP/HTTPSではsandbox内で実行する。

入力、鍵、通常表示と比較モード、言語を変更すると、以前の生成物はクリアされます。再生成するまで実行・コピー・保存は無効になります。

### 🎮 便利な機能の使い方

- **比較モード**：「🔀 比較モード」ボタンによる元コードと生成物の横並び表示
- **テーマ切り替え**：ヘッダーの🌙/☀️ボタンによるダークモード/ライトモード切り替え
- **ヘルプ参照**：「📖 ヘルプ」ボタンによる説明の表示
- **チュートリアル**：「❓ チュートリアル」ボタンによる6ステップの操作案内
- **キーボード操作**：矢印/Home/Endによるタブ移動、Tabによるダイアログ内移動、Escapeによる終了
- **言語切り替え**：ヘッダーの日英切り替えボタンによる表示変更

初期言語は`?lang=ja`または`?lang=en`、保存した言語、ブラウザーの言語の順に決まります。ブラウザーの言語が日本語以外なら英語になります。テーマと言語はlocalStorageに保存しますが、保存や読み出しが拒否されても既定値で動作を続けます。入力コードと生成物は保存しません。

### 🧪 サンプルコードで動作確認（初回実験手順）

日本語画面を開くと、次のサンプルが入力欄に表示されます。変換と隔離実行の確認に使えます。

<!-- sample:start -->
```javascript
// サンプル：実行結果の欄に "Hello Obfuscation!" を表示する
console.log("Hello Obfuscation!");
const p = document.createElement("p");
p.textContent = "✅ 実行されました";
document.body.appendChild(p);
```
<!-- sample:end -->

**実験手順：**

1. 上のサンプルが入力欄に表示されていることを確認する。
2. シフト量を初期値の3にする。
3. 「難読化コードを生成」ボタンを押す。
4. 出力欄に生成物が表示されることを確認する。
5. HTTP/HTTPSで開いた画面で「この場で実行（テスト）」ボタンを押す。
6. 実行結果欄の「Hello Obfuscation!」と、iframe内の「✅ 実行されました」を確認する。

生成されるコードは次のとおりです。日本語はシフト対象外なので、コメントや文字列の日本語部分は生成物にも残ります。

<!-- snippet:start -->
```javascript
(function(){
  const d = function(t,s){const b=32,n=95;let o="";for(let i=0;i<t.length;i++){const c=t.charCodeAt(i);if(c>=32&&c<=126){const dec=((c-b-((s%n)+n)%n+n)%n)+b;o+=String.fromCharCode(dec);}else{o+=t[i];}}return o;};
  const enc = "22#サンプル：実行結果の欄に#%Khoor#Reixvfdwlrq$%#を表示する\nfrqvroh1orj+%Khoor#Reixvfdwlrq$%,>\nfrqvw#s#@#grfxphqw1fuhdwhHohphqw+%s%,>\ns1wh{wFrqwhqw#@#%✅#実行されました%>\ngrfxphqw1erg|1dsshqgFklog+s,>";
  const sft = 3;
  const dec = d(enc, sft);
  (0, eval)(dec);
})();
```
<!-- snippet:end -->

この例は`test/fixtures/expect.json`の参照データと一致し、自動テストで検査します。

### 生成物の利用とスコープ

生成物は文字列を復号し、間接呼び出しの`eval`で実行します。非strictのトップレベルの`function`と`var`は実行先のグローバルに残りますが、`let`・`const`やstrictモード内の宣言は同じ扱いにはなりません。元のスクリプトとスコープが完全に同じになることは保証しません。ツール内での実行先はiframeであり、親ページには宣言が残りません。

HTMLの`<script>`内へ貼る場合、入力由来の文字列に含まれる`<`は十六進エスケープへ変換されます。復号関数内の比較演算子は維持しています。この処理はHTMLによるスクリプトの途中終了を防ぐためのもので、実行するコードの安全性を保証するものではありません。

実行先で`eval`を禁止しているCSPでは生成物は動きません。インラインスクリプトにも別の制限があるため、既存サイトのCSPを緩めて貼り付けず、このツールの隔離した実行画面で学習してください。`.js`ファイルとして読み込む場合も、動的評価の制限は適用されます。

---
## ⚠️ 注意

- 本ツールは秘匿ではなく難読化（可読性低下）を目的とした教材である。
- 生成物には復号処理と鍵が含まれ、静的解析で元コードを復元できる。
- ASCII 32〜126以外の文字は変換しないため、日本語や絵文字はそのまま残る。
- 秘密情報を入力せず、出所や内容を確認できないコードは実行しない。
- 生成物を別のページで実行した場合、このツールのsandboxによる隔離は引き継がれない。

### セキュリティに関する説明

変換処理はブラウザー内で行い、入力コードをサーバーへ送信する機能はありません。ただし、実行するJavaScript自体はプログラムです。「クライアント側だから安全」「他者への影響は不可能」とは保証できません。

親ページはCSPで`eval`を禁止しています。`eval`を許可するのは実行用iframeの文書だけで、iframeには`allow-same-origin`を付けません。iframeから親ページのDOMやlocalStorageへ直接アクセスできないようにし、結果は送信元・origin・実行IDを検査した`postMessage`で受け取ります。実行用文書のCSPでは接続、フォーム送信、追加iframeなども制限しています。

各実行でiframeを作り直し、同期処理中のconsole出力と例外を結果欄へ返します。consoleの一時的な変更は同期処理の終了時に復元するため、タイマーなどの非同期console出力は結果欄に表示しません。非同期の例外・未処理のPromise拒否は、再生成や入力・設定の変更でiframeが破棄されるまで通知します。「実行完了」は同期処理の完了を示します。

実行へ渡すコード長は200万UTF-16コード単位、ログと例外はそれぞれ100件、1件の通知は4,000UTF-16コード単位を上限とします。これらの上限は、後述の文字数表で使うコードポイント単位とは異なります。

読込や同期実行の応答を待つ時間には5秒の制限がありますが、ブラウザーのイベント処理が止まる無限ループを確実に終了できる仕組みではありません。sandboxはCPU・メモリーの資源隔離や、あらゆる通信経路の遮断を保証しません。不審なコードを解析するための環境としては使わないでください。

localStorageへ保存するのはテーマと言語だけです。設定の読み書きは例外を処理し、Storageを利用できない場合も画面を初期化します。個人用の`.claude/`設定は追跡対象外です。過去のGit履歴に含まれる情報まで削除する変更ではありません。

---

## 🔬 技術・セキュリティ解説

本ツールで使用されている技術の詳細解説と、セキュリティの観点からの考察については以下をご覧ください：

📖 **[技術解説・セキュリティガイド](SECURITY.md)**

- シーザー暗号の実装詳細
- 自己復号スニペットの構造
- 難読化の限界と防御上の注意
- 防御側の検知技術
- セキュリティ研究者への提言

### 参照サンプルの文字数とエントロピー

文字数はコードポイント単位で数えます。絵文字1個は1文字です。次の値は前掲の日本語サンプルをシフト3で変換した場合の値です。

<!-- stats:start -->
| 項目 | 値 |
|---|---:|
| 元コードの文字数 | 175 |
| シフト対象の文字数 | 146 |
| 対象外の文字数 | 29 |
| 生成物の文字数 | 490 |
| 文字数比（%） | 280 |
| 変換前のエントロピー（bit/文字） | 5.2597 |
| 変換後ペイロードのエントロピー（bit/文字） | 5.2597 |
<!-- stats:end -->

「文字数比」は生成物の文字数を元コードの文字数で割った百分率です。圧縮性能を表す値ではありません。空入力は生成物311文字、文字数比は画面では「未定義」と表示します。シーザー変換は文字の出現頻度を保つため、エントロピーの増加を安全性や難読化の検知根拠にできません。

---

## 🎯 実装済み機能

### v1.0で実装された主要機能

- ✅ **シーザー暗号による暗号化**
- ✅ **比較モード（横並び表示）** 
- ✅ **ダークモード/ライトモード切り替え**
- ✅ **チュートリアル機能**
- ✅ **ヘルプモーダル**
- ✅ **トースト通知**
- ✅ **入力バリデーション**
- ✅ **レスポンシブデザイン**
- ✅ **隔離実行と同期ログ・例外の表示**
- ✅ **日英表示と設定保存の例外処理**
- ✅ **CSP・キーボード操作・ARIA・配色の改善**
- ✅ **参照値と文書を検査する自動テスト**

### 将来の拡張予定

以下は従来の構想に含まれていた検討項目です。いずれも未実装で、今回の改善には含まれません。追加を保証する予定表ではなく、今後は防御と学習に役立つ内容を選びます。

- **複数暗号方式対応**：古典暗号の変換規則を比較する教材としての検討案
- **多段暗号化**：従来の構想に含まれていた未実装項目
- **鍵の難読化**：未実装項目であり、鍵の秘匿を保証する機能ではない
- **Unicode対応**：現在の範囲外文字の保持とは別に、変換対象を学ぶための検討案
- **変数名・関数名の難読化**：従来の構想に含まれていた未実装項目
- **CLI版・Node.js対応**：現在のNode.js利用は自動テストであり、利用者向けCLIは未実装

---

## 🧪 テスト

Node.js 22以上で、リポジトリのルートから実行します。npmの依存パッケージはなく、インストールやビルドは不要です。

```sh
npm test
```

`node --test`で、既知解答、全95シフトの往復、文字列エスケープ、鍵の検証、統計、sandboxの通信、HTML、配色、文書を検査します。READMEの生成例・数値表・日英の見出し対応も自動テストの対象です。GitHub Actionsはpushとpull_requestで同じテストを実行します。実画面の配置やブラウザー固有の挙動は、ブラウザーで別途確認します。

## 📁 ディレクトリー構造

各行はプロジェクトルートからの相対パスです。

<!-- inventory:start -->
```text
classic-js-obfuscator/               # プロジェクトルート
.github/                             # GitHub設定
.github/workflows/                   # 自動テストの定義
.github/workflows/test.yml           # Node.js 22でpush・pull_requestを検査
.gitignore                           # 個人用設定の除外
.nojekyll                            # GitHub PagesでJekyll処理を無効化
CLAUDE.md                            # 開発構成と作業上の規則
LICENSE                              # MITライセンス
README.md                            # 日本語の機能説明と使い方
README.en.md                         # 同じ内容の英語版
SECURITY.md                          # 難読化の限界と防御・検知の説明
assets/                              # 画面のスクリーンショット
assets/en/                           # 英語画面の画像
assets/en/screenshot.png             # 英語・ライトテーマの比較モード
assets/screenshot.png                # 日本語・ライトテーマの比較モード
assets/screenshot2.png               # 日本語・ダークテーマの比較モード
index.html                           # 画面構造と親ページのCSP
js/                                  # 共通処理のモジュール
js/i18n.js                           # 日英辞書と言語設定
js/obfuscator-core.js                # DOM非依存の変換・検証・統計
js/sandbox-runner.js                 # iframeの生成とメッセージ検証
package.json                         # 依存なしのテスト実行設定
sandbox/                             # 隔離実行用の文書と処理
sandbox/runner.css                   # 隔離画面のスタイル
sandbox/runner.html                  # 実行文書と専用CSP
sandbox/runner.js                    # 隔離実行・ログ・例外の通知
script.js                            # 画面操作と状態の更新
style.css                            # 日英・テーマ・画面幅に対応するスタイル
test/                                # Node.js標準テスト
test/contrast.test.js                # ライト・ダークの配色比
test/core.test.js                    # 既知解答・往復・鍵・統計
test/fixtures/                       # 変更しない参照データ
test/fixtures/expect.json            # 生成例と既知解答の期待値
test/format.test.js                  # UTF-8・行長・可読性
test/html.test.js                    # CSP・HTML・ARIA・ローカル資産
test/i18n.test.js                    # 日英辞書と表示の対応
test/readme.test.js                  # 生成例・統計・メタデータ・構成
test/sandbox.test.js                 # 隔離実行とメッセージ検証
test/security.test.js                # 検知式・統計・エントロピーの整合性
test/snippet.test.js                 # 生成物の実行・エスケープ・スコープ
test/ui.test.js                      # コピー待機中の変更と画面状態
```
<!-- inventory:end -->

## 💻 動作環境

JavaScriptを有効にした現在のChrome・Edge・Firefox・Safariを対象にしています。ビルド、CDN、外部APIは使いません。ブラウザーや設定によってクリップボード・ファイル保存の許可が必要な場合があります。

| 開き方 | 生成・コピー・保存 | 画面内の実行 |
|---|---|---|
| HTTP/HTTPS | 利用可能 | sandbox iframeで利用可能 |
| `file://` | 利用可能 | 無効。HTTPで開く案内を表示 |

コピーAPIが使えない場合は選択コピーを試し、利用できなければ選択された出力を手動でコピーします。保存はブラウザーのダウンロード機能を使います。`file://`の実行無効化は、このツールで互換性をそろえるための方針です。

### ローカルHTTPで開く方法

Python 3がある場合は、リポジトリのルートで次のコマンドを実行します。

```sh
python -m http.server 8000 --bind 127.0.0.1
```

ブラウザーで[http://127.0.0.1:8000/](http://127.0.0.1:8000/)を開きます。サーバーを止めるときはターミナルでCtrl+Cを押します。生成だけを行う場合は`index.html`を直接開く方法も使えます。

---

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) をご覧ください。

---

## 🛠️ このツールについて

本ツールは、「生成AIで作るセキュリティツール100」プロジェクトの一環として開発されました。  
このプロジェクトでは、AIの支援を活用しながら、セキュリティに関連するさまざまなツールを100日間にわたり制作・公開していく取り組みを行っています。

プロジェクトの詳細や他のツールについては、以下のページをご覧ください。

🔗 [https://akademeia.info/?page_id=42163](https://akademeia.info/?page_id=42163)
