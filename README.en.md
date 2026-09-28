English · [日本語](README.md)

# Classic JS Obfuscator - Classical Cipher JavaScript Obfuscation Tool

![GitHub Repo stars](https://img.shields.io/github/stars/ipusiron/classic-js-obfuscator?style=social)
![GitHub forks](https://img.shields.io/github/forks/ipusiron/classic-js-obfuscator?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/ipusiron/classic-js-obfuscator)
![GitHub license](https://img.shields.io/github/license/ipusiron/classic-js-obfuscator)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://ipusiron.github.io/classic-js-obfuscator/)

**Day042 - 100 Security Tools with Generative AI**

**Classic JS Obfuscator** generates JavaScript snippets transformed with a classical cipher, the Caesar cipher.
The embedded decoder and `eval` make each snippet **self-decoding and self-executing**.

The interface has two tabs: Caesar is implemented, while Vigenère remains unimplemented.
In-page execution takes place in a sandbox iframe isolated from the parent page. This is a learning tool for trusted samples, not a way to protect secrets or determine whether suspicious code is safe.

---

## 🌐 Demo

👉 [https://ipusiron.github.io/classic-js-obfuscator/](https://ipusiron.github.io/classic-js-obfuscator/)

---

## 📸 Screenshots

> ![English comparison mode in the light theme](assets/en/screenshot.png)
>
> *The English comparison view with the sample input and generated output in the light theme*

> ![Japanese comparison mode in the light theme](assets/screenshot.png)
>
> *The equivalent Japanese comparison view in the light theme*

> ![Japanese comparison mode in the dark theme](assets/screenshot2.png)
>
> *The same sample and comparison view in the dark theme; this image shows the Japanese interface*

---

## ✨ Features

### 🔐 Cipher features

- **Caesar transformation**: Shift the 95 printable ASCII characters from 32 through 126
- **Self-decoding snippets**: An IIFE containing the decoder and transformed payload
- **Shift selection**: Integers from 0 through 94; 0 leaves characters unchanged, and a larger shift does not mean stronger encryption
- **JavaScript output**: Use only after checking the destination's CSP and scope requirements

### 🎨 User interface

- **Comparison mode**: Display the original and transformed code side by side
- **Dark/light themes**: Switch the interface theme
- **Tutorial**: A six-step guide
- **Help dialog**: Usage and security information
- **Toast notifications**: Feedback such as successful copying
- **Japanese/English selection**: Translate help, errors and tutorial content as well as the main interface

### ⚡ Convenience features

- **In-page test execution**: Run inside a sandbox when the page is served over HTTP/HTTPS
- **One-click copying**: Clipboard access with a selection-based fallback
- **Download**: Save output as a `.js` file
- **Responsive layout**: Support mobile and desktop displays
- **Input validation**: Reject empty keys, decimals, exponent notation, full-width digits, negative numbers and values of 95 or greater
- **Output freshness**: Clear output and request regeneration when input, key, view mode or language changes

Whitespace surrounding the key is trimmed, and leading zeroes are accepted. An empty key is distinct from shift 0.

### 🛡️ Security measures

- **Client-side transformation**: The transformation does not transmit or persist input code
- **Isolated execution**: An iframe with `sandbox="allow-scripts"` and separate parent/child CSPs
- **Result rendering**: Display synchronous console output and exceptions using `textContent`
- **Limited preference storage**: Save only theme and language in localStorage, and continue if storage is unavailable
- **Educational design**: Explain the limits of obfuscation and sandboxing in the interface and documentation

---

## 📋 Usage

### Basic usage

1. **Enter code**: Put trusted JavaScript in the original-code field.
2. **Choose a shift**: Enter an integer from 0 through 94. The default is 3.
3. **Generate**: Press the button to generate obfuscated code.
4. **Use the result**: Copy or save the output, or execute it in the sandbox over HTTP/HTTPS.

Changing the input, key, normal/comparison view or language clears the previous output. Execution, copying and downloading stay disabled until the output is regenerated.

### 🎮 Using the convenience features

- **Comparison mode**: Use the comparison button to display input and output side by side
- **Theme selection**: Use the 🌙/☀️ header button to switch between dark and light themes
- **Help**: Use the help button to display instructions
- **Tutorial**: Use the tutorial button to start the six-step guide
- **Keyboard operation**: Arrow keys/Home/End move between tabs; Tab moves within dialogs; Escape closes them
- **Language selection**: Use the Japanese/English button in the header

The initial language is selected from `?lang=ja` or `?lang=en`, then a saved preference, then the browser language. Browser languages other than Japanese select English. Theme and language are saved in localStorage, but denied reads or writes do not prevent the page from continuing with defaults. Input code and output are not stored.

### 🧪 Checking the sample (first experiment)

The Japanese interface starts with the following sample. It demonstrates transformation and isolated execution. The code is intentionally reproduced unchanged here so that the reference output and statistics are identical in both READMEs. The English interface uses an English sample.

<!-- sample:start -->
```javascript
// サンプル：実行結果の欄に "Hello Obfuscation!" を表示する
console.log("Hello Obfuscation!");
const p = document.createElement("p");
p.textContent = "✅ 実行されました";
document.body.appendChild(p);
```
<!-- sample:end -->

**Experiment steps:**

1. Confirm that the reference sample above is in the input field; paste it there if the English sample is displayed.
2. Set the shift to the default value, 3.
3. Press the generate button.
4. Confirm that the generated snippet appears in the output field.
5. On a page opened over HTTP/HTTPS, press the in-page execution button.
6. Look for “Hello Obfuscation!” in the log area and “✅ 実行されました” inside the iframe.

The resulting code is shown below. Japanese characters are outside the shifted range, so Japanese comments and string content remain visible in the output.

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

This example is identical to the reference data in `test/fixtures/expect.json` and is checked by automated tests.

### Using generated snippets and understanding scope

The snippet decodes its string and executes it through an indirect `eval` call. Non-strict top-level `function` and `var` declarations remain in the execution context's global scope, but `let`, `const`, and declarations in strict code do not behave the same way. Scope is not guaranteed to match the original script in every case. In-page execution targets the iframe, so these declarations do not appear in the parent page.

When embedding output in an HTML `<script>` element, input-derived `<` characters inside the payload string are hexadecimal-escaped. Comparison operators in the decoder remain unchanged. This prevents input-derived HTML delimiters from ending the script prematurely; it does not establish that the executed program is safe.

Generated snippets cannot run under a CSP that prohibits `eval`. Inline scripts have additional restrictions. Do not weaken an existing site's CSP to paste a snippet into it; use this tool's isolated execution view for learning. Loading output as a `.js` file does not bypass restrictions on dynamic evaluation.

---

## ⚠️ Cautions

- This tool demonstrates obfuscation, meaning reduced readability, rather than confidentiality.
- Generated output contains the decoder and key, so static analysis can recover the original code.
- Characters outside ASCII 32–126 are not transformed; Japanese text and emoji remain visible.
- Do not enter secrets or execute code whose source and contents you cannot verify.
- Running a generated snippet on another page does not carry this tool's sandbox protection with it.

### Security explanation

Transformation occurs inside the browser, with no feature that sends input code to a server. However, the JavaScript being executed is still a program. Client-side execution does not establish safety or guarantee that other people cannot be affected.

The parent page's CSP prohibits `eval`. Only the execution iframe's document permits it, and the iframe does not have `allow-same-origin`. The frame cannot directly access the parent DOM or localStorage. Results arrive through `postMessage`, with the source window, origin and run identifier checked. The execution document's CSP also restricts connections, form submissions and additional frames.

Each execution creates a new iframe and reports console output and exceptions from the synchronous execution. Console methods are restored when that synchronous execution finishes, so asynchronous console output from timers is not displayed in the result area. Asynchronous errors and unhandled Promise rejections remain reportable until regeneration or a change to input or settings removes the frame. “Execution complete” refers to synchronous completion.

Code sent for execution is limited to 2,000,000 UTF-16 code units. Logs and errors are each limited to 100 messages, with 4,000 UTF-16 code units per message. These limits use a different unit from the code-point counts in the statistics table below.

The wait for loading or a synchronous execution response is limited to five seconds, but this cannot reliably terminate an infinite loop that blocks the browser's event processing. The sandbox does not provide CPU/memory resource isolation or guarantee that every possible communication route is blocked. Do not use it as an environment for analyzing suspicious code.

Only theme and language preferences are saved in localStorage. Storage access is wrapped in exception handling so initialization continues if it is unavailable. Personal `.claude/` settings are excluded from version control. This change does not erase information already present in Git history.

---

## 🔬 Technical and security guide

The following document explains the underlying techniques and their security implications:

📖 **[Technical and security guide](SECURITY.md)**

- Caesar transformation details
- Self-decoding snippet structure
- Limits of obfuscation and defensive considerations
- Defensive detection techniques
- Recommendations for security researchers

### Reference sample statistics and entropy

Character counts use Unicode code points, so one emoji counts as one character. These values are for the Japanese reference sample shown above with a shift of 3.

<!-- stats:start -->
| Metric | Value |
|---|---:|
| Original code points | 175 |
| Shifted code points | 146 |
| Unshifted code points | 29 |
| Generated code points | 490 |
| Character-count ratio (%) | 280 |
| Original entropy (bits/character) | 5.2597 |
| Transformed payload entropy (bits/character) | 5.2597 |
<!-- stats:end -->

The character-count ratio is the generated length divided by the original length, expressed as a percentage. It is not a measure of compression. Empty input produces 311 characters, with the ratio shown as “undefined” in the interface. A Caesar transformation preserves character frequencies, so an entropy increase cannot serve as evidence of protection or as a dependable detector for this transformation.

---

## 🎯 Implemented features

### Main features implemented in v1.0

- ✅ **Caesar transformation**
- ✅ **Side-by-side comparison mode**
- ✅ **Dark/light themes**
- ✅ **Tutorial**
- ✅ **Help dialog**
- ✅ **Toast notifications**
- ✅ **Input validation**
- ✅ **Responsive layout**
- ✅ **Isolated execution with synchronous logs and errors**
- ✅ **Japanese/English display with resilient preference storage**
- ✅ **CSP, keyboard, ARIA and contrast improvements**
- ✅ **Automated checks for reference outputs and documentation**

### Future extension ideas

The following items appeared in the earlier project plans. None is implemented or included in this improvement. They are possibilities, not a promised schedule; future work will be selected for its defensive and educational value.

- **Additional ciphers**: A possible teaching aid for comparing classical transformation rules
- **Layered transformations**: An unimplemented item from the earlier plans
- **Key obfuscation**: An unimplemented idea, not a guarantee of key confidentiality
- **Unicode support**: A possible lesson about the transformed character range, distinct from the current preservation of out-of-range characters
- **Variable/function-name obfuscation**: An unimplemented item from the earlier plans
- **CLI/Node.js support**: Node.js currently runs automated tests; there is no user-facing CLI

---

## 🧪 Tests

Run this command from the repository root with Node.js 22 or newer. There are no npm dependencies, and no install or build step is required.

```sh
npm test
```

`node --test` checks known answers, round trips for all 95 shifts, string escaping, key validation, statistics, sandbox messages, HTML, contrast and documentation. README examples, numeric tables and Japanese/English heading correspondence are also tested. GitHub Actions runs the same tests on pushes and pull requests. Actual layout and browser-specific behavior require separate browser checks.

## 📁 Directory structure

Each line is a path relative to the project root.

<!-- inventory:start -->
```text
classic-js-obfuscator/               # Project root
.github/                             # GitHub configuration
.github/workflows/                   # Automated test workflows
.github/workflows/test.yml           # Run Node.js 22 tests on pushes and pull requests
.gitignore                           # Exclude personal configuration
.nojekyll                            # Disable Jekyll processing on GitHub Pages
CLAUDE.md                            # Development structure and working rules
LICENSE                              # MIT license
README.md                            # Japanese features and usage
README.en.md                         # Complete English version
SECURITY.md                          # Limits of obfuscation and defensive detection
assets/                              # Application screenshots
assets/en/                           # English-language screenshots
assets/en/screenshot.png             # English comparison mode in the light theme
assets/screenshot.png                # Japanese comparison mode in the light theme
assets/screenshot2.png               # Japanese comparison mode in the dark theme
index.html                           # Interface structure and parent CSP
js/                                  # Shared modules
js/i18n.js                           # Japanese/English messages and language preferences
js/obfuscator-core.js                # DOM-independent transformation, validation and statistics
js/sandbox-runner.js                 # Frame lifecycle and message validation
package.json                         # Dependency-free test commands
sandbox/                             # Isolated execution document and scripts
sandbox/runner.css                   # Isolated output styles
sandbox/runner.html                  # Execution document with its own CSP
sandbox/runner.js                    # Isolated execution, logs and error reporting
script.js                            # Interface events and state updates
style.css                            # Styles for languages, themes and viewport sizes
test/                                # Node.js built-in tests
test/contrast.test.js                # Light/dark color contrast
test/core.test.js                    # Known answers, round trips, keys and statistics
test/fixtures/                       # Fixed reference data
test/fixtures/expect.json            # Reference outputs and known answers
test/format.test.js                  # UTF-8, line lengths and readable formatting
test/html.test.js                    # CSP, HTML, ARIA and local assets
test/i18n.test.js                    # Language dictionaries and display parity
test/readme.test.js                  # Examples, statistics, metadata and document structure
test/sandbox.test.js                 # Isolation and message validation
test/security.test.js                # Detection patterns, statistics and entropy consistency
test/snippet.test.js                 # Execution, escaping and scope
test/ui.test.js                      # Clipboard waits and interface state changes
```
<!-- inventory:end -->

## 💻 Requirements

The tool targets current Chrome, Edge, Firefox and Safari with JavaScript enabled. It uses no build system, CDN or external API. Clipboard and download permissions may depend on the browser and its settings.

| How the page is opened | Generate, copy and save | In-page execution |
|---|---|---|
| HTTP/HTTPS | Available | Available in a sandbox iframe |
| `file://` | Available | Disabled; an HTTP-opening instruction is displayed |

If the Clipboard API is unavailable, the tool tries selection-based copying and otherwise leaves the output selected for manual copying. Saving uses the browser's download feature. Disabling execution for `file://` is this tool's compatibility policy.

### Opening a local HTTP server

If Python 3 is available, run the following command from the repository root:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/) in the browser. Press Ctrl+C in the terminal to stop the server. Opening `index.html` directly is also supported if you only need generation.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🛠️ About this tool

This tool was developed as part of the **100 Security Tools with Generative AI** project.
The project uses generative AI assistance to create and publish security-related tools over a period of 100 days.

For project details and other tools, see:

🔗 [https://akademeia.info/?page_id=42163](https://akademeia.info/?page_id=42163)
