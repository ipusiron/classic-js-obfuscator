# セキュリティ解説・技術ガイド

## 🔬 技術解説

### シーザー暗号の実装

本ツールは古典的なシーザー暗号をJavaScriptコードの難読化に応用しています。

#### 暗号化アルゴリズム

```javascript
function caesarEncrypt(text, shift) {
  const base = 32, span = 95; // ASCII可視文字範囲
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 32 && code <= 126) {
      const enc = ((code - base + (shift % span) + span) % span) + base;
      out += String.fromCharCode(enc);
    } else {
      out += text[i]; // 範囲外はそのまま
    }
  }
  return out;
}
```

#### 自己復号スニペットの構造

生成されるコードは以下の構造を持ちます：

```javascript
(function(){
  const d = function(t,s){...}; // 復号関数（最小化済み）
  const enc = "暗号化されたペイロード";
  const sft = 3; // シフト量
  const dec = d(enc, sft); // 復号実行
  eval(dec); // 元コード実行
})();
```

### 🛡️ 防御的セキュリティの観点

#### このツールが教える防御技術

1. **静的解析の限界**
   - 単純な文字列置換では検知困難
   - 動的実行時まで本来の処理が判明しない

2. **コード混同技術**
   - 可読性を意図的に低下させる技術
   - 逆解析の時間コストを増大

3. **自己修正コード**
   - 実行時に自分自身を復号・変更
   - 静的ファイル解析では元コードが不明

## ⚠️ 攻撃者の悪用手法と対策

### 想定される悪用シナリオ

#### 🔴 マルウェア配布での悪用

**攻撃手法:**
```javascript
// 悪意のある例（教育目的での説明）
(function(){
  const d = function(t,s){...};
  const enc = "暗号化されたマルウェアコード";
  eval(d(enc, 13)); // 復号して実行
})();
```

**具体的な脅威:**
- ブラウザ拡張機能への埋め込み
- 正規Webサイトへのインジェクション
- メール添付ファイルでの配布
- ソーシャルエンジニアリングと組み合わせた配布

**対策:**
- **Content Security Policy (CSP)** でeval禁止
- **静的解析ツール** によるIIFE検出
- **動的解析環境** での事前実行
- **サンドボックス環境** でのコード実行

#### 🔴 フィッシングサイトでの悪用

**攻撃手法:**
- 正規サイトに見せかけた偽装
- 認証情報窃取コードの隠蔽
- ブラウザ拡張機能への埋め込み
- 広告ネットワークでの配布

**対策:**
- **サブリソース整合性 (SRI)** チェック
- **定期的なコードレビュー**
- **異常な暗号化コード** の監視
- **ユーザー教育** と意識向上

#### 🔴 供給チェーン攻撃での悪用

**攻撃手法:**
- NPMパッケージへの混入
- CDN経由での配布
- 依存関係を通じた拡散
- 開発ツールへの埋め込み

**対策:**
- **パッケージの整合性検証**
- **依存関係の定期監査**
- **自動化されたセキュリティスキャン**
- **ベンダー評価** の徹底

### 防御側の検知技術

#### 1. パターンマッチング

**基本的な正規表現:**
```regex
/\(function\(\)\{.*eval\(.*\)\;\}\)\(\)\;/
```

**より高度な検出パターン:**
```regex
// IIFE + eval の組み合わせ
/\(function\([^)]*\)\{[^}]*eval\([^}]*\}\)\([^)]*\)/

// 暗号化された文字列（高エントロピー）
/["'][A-Za-z0-9+/=]{50,}["']/

// 復号関数の特徴的パターン
/function\([^)]*\)\{[^}]*charCodeAt[^}]*fromCharCode[^}]*\}/
```

#### 2. エントロピー解析

**実装例:**
```javascript
function calculateEntropy(str) {
  const freqs = {};
  for (let char of str) {
    freqs[char] = (freqs[char] || 0) + 1;
  }
  
  let entropy = 0;
  const len = str.length;
  for (let freq of Object.values(freqs)) {
    const p = freq / len;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
}

// 使用例
const suspiciousString = "kJ8#mN2$pQ9..."; // 暗号化された文字列
if (calculateEntropy(suspiciousString) > 4.5) {
  console.warn("高エントロピー文字列を検出");
}
```

#### 3. 動的解析

**監視すべきAPI:**
- `eval()`, `Function()`, `setTimeout()`, `setInterval()`
- `document.write()`, `innerHTML`
- `XMLHttpRequest`, `fetch()`
- `location.href`, `window.open()`

**実装例:**
```javascript
// eval呼び出しの監視
const originalEval = window.eval;
window.eval = function(code) {
  console.warn("eval実行を検出:", code.substring(0, 100));
  // セキュリティチェックロジック
  if (isSecurityThreat(code)) {
    throw new Error("セキュリティ脅威を検出");
  }
  return originalEval.call(this, code);
};
```

### 高度な検知手法

#### AST（抽象構文木）解析

```javascript
// Babel/ESPrimaを使用した構造解析
const ast = esprima.parseScript(code);
estraverse.traverse(ast, {
  enter: function(node) {
    if (node.type === 'CallExpression' && 
        node.callee.type === 'Identifier' && 
        node.callee.name === 'eval') {
      console.warn("eval呼び出しを検出");
    }
  }
});
```

#### 機械学習による検知

**特徴量:**
- コードの統計的特性（文字分布、構文パターン）
- API呼び出しシーケンス
- 実行時の振る舞いパターン
- ネットワーク通信パターン

## 🎓 セキュリティ研究者・開発者への提言

### 教育・研究目的での活用

1. **マルウェア解析** の学習教材として
2. **静的解析ツール** の性能評価用データセット
3. **動的解析技術** の開発・テスト環境
4. **セキュリティ意識向上** のデモンストレーション

### 防御策開発の重要性

1. **新しい検知手法** の研究開発
2. **既存ツールの改良** とアップデート
3. **業界標準** の策定と普及
4. **インシデント対応** プロセスの整備

### 法的・倫理的考慮事項

⚠️ **重要な注意事項:**

- **教育目的のみ** での使用を強く推奨
- **悪意のある用途** での使用は法的責任を伴う
- **研究発表** 時は適切な倫理審査を経ること
- **脆弱性開示** は責任を持って行うこと

### インシデント対応ガイドライン

#### 類似コードを発見した場合の対処法

1. **即座の隔離**
   - 影響範囲の特定
   - サービス停止の検討
   - 証拠保全

2. **詳細分析**
   - 復号・逆解析の実施
   - 被害状況の調査
   - 感染経路の特定

3. **対応・復旧**
   - 悪意のあるコードの除去
   - システムの復旧
   - セキュリティ強化

4. **報告・共有**
   - 関係者への報告
   - 必要に応じた当局への通報
   - コミュニティでの情報共有

## 🔗 参考資料

### 学術論文・技術文書
- "Malicious JavaScript Detection using Machine Learning" (IEEE, 2020)
- "Dynamic Analysis of Obfuscated JavaScript" (USENIX Security, 2019)
- "Code Obfuscation Techniques and Their Detection" (ACM Computing Surveys, 2021)

### セキュリティツール
- **ESLint** - 静的解析
- **JSDetox** - JavaScript解析
- **Cuckoo Sandbox** - 動的解析
- **YARA** - パターンマッチング

### 業界標準・ガイドライン
- OWASP JavaScript Security Guidelines
- NIST Cybersecurity Framework
- ISO/IEC 27001 Security Standards

---

**免責事項:** この文書は教育・研究目的で作成されています。記載された技術や手法を悪意のある目的で使用することは推奨されません。使用者は適用される法律や規制を遵守する責任があります。