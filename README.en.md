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

> ![English normal view in the light theme](assets/en/screenshot.png)
>
> *The English normal view with the basic sample and generated output in the light theme*

> ![English learning lab in the light theme](assets/en/screenshot2.png)
>
> *The English learning lab with transformation steps and the size breakdown expanded in the light theme*

> ![Japanese normal view in the light theme](assets/screenshot.png)
>
> *The Japanese normal view with the basic sample and generated output in the light theme*

> ![Japanese learning lab in the dark theme](assets/screenshot2.png)
>
> *The Japanese learning lab with transformation steps and the size breakdown expanded in the dark theme*

> ![Japanese non-executing inspection in the light theme](assets/screenshot3.png)
>
> *The Japanese inspector after loading and recovering the current snippet, with a match against the source captured at load time*

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
- **Transformation steps**: Compare original characters, shifted characters and escaped text by code point
- **Non-executing inspection**: Recover a fixed-format snippet and compare it with the source captured by explicitly loading the output
- **Sizes and character frequencies**: Show three length units, wrapper overhead, frequencies and entropy
- **Six samples and one-step restore**: Explicitly load a sample, clear input, reset defaults or restore the previous input state

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

### Using the learning lab

The learning lab calculates transformation steps, sizes and character frequencies from the source and key used for generation.
The normal and comparison views produce the same learning results.

1. Load a sample, check the key and generate the obfuscated code.
2. Expand “Transformation steps” to follow each original character through to the string literal.
3. Expand “Size breakdown” and “Character frequencies” to compare the added content and unchanged properties.
4. In “Decode without execution”, press “Load current generated snippet”.
5. Press “Recover without executing” and review the format match, recovered content and comparison with the source captured at load time.

Changing the input, key, view or language, or loading, clearing, resetting or restoring input, clears the output and learning results.
Regeneration is required even if an action such as loading a sample leaves the input unchanged.
Learning calculations accept source input of up to 100,000 UTF-16 code units.
Above that limit, only the learning results are cleared and a limit message is shown; the existing generation process continues.
Generation, learning and non-executing recovery also work over `file://`, but the existing code-execution action is disabled.

#### Inspecting the transformation steps

Each row shows the original code point, whether it is in the ASCII shift range, the shifted character and the escaped literal body.
Only the first 200 code points are displayed, alongside the full count.
Whitespace, control characters, combining characters, bidirectional controls and lone surrogates use identifying labels and `U+` notation.
These display labels are never written back to the source or generated snippet.

Code points are not the same as visually perceived characters.
The emoji 😀 is one code point, but combining sequences and multi-code-point emoji are counted separately.

#### Inspecting restoration without execution

The inspection input is a paste field independent of the main editor.
It accepts only this tool's fixed seven-line output format; it is not a general JavaScript deobfuscator.
The embedded decoder, key notation, quotes, whitespace, line endings and generator-emitted escapes are checked, followed by a full comparison with regenerated output.
The generation key accepts `003`, but writes `3` into the snippet, and inspection accepts only that canonical notation.
Appended code, a changed decoder, HTML or Markdown wrappers and truncated snippets are rejected.

Inspection uses string processing only; it never passes the input to `eval`, `Function`, a script element or an execution iframe.
Recovered content is displayed as text in a read-only field and is never written back into the main editor.
A format match does not establish JavaScript syntax validity or safety.
A match against the source captured at load time establishes only equality with that string, not safety.

“Load current generated snippet” captures a still-current snippet and the source used to generate it in memory.
Loading does not recover anything automatically; it clears the preceding result and returns to an uninspected state.
Later changes to the main input or key do not change the comparison source: it remains the source captured at load time, not the current editor contents.
Manually editing the paste field clears both the comparison source and result, even if the entered string is unchanged.
Manually pasted snippets can be recovered, but have no captured source for comparison.
A failed inspection removes the preceding recovered result; “Clear inspection” also removes the pasted input and comparison source.
Changing the language preserves the pasted input, result and comparison source, translating only the explanation.

Comparison uses exact JavaScript string equality, without trimming, Unicode normalization or newline conversion.
Mismatches are reported at a one-based code-point position, including which side has reached the end of its string.
Inspection input is limited to 2,000,000 UTF-16 code units.
An empty paste field is an inspection error, whereas a canonical snippet generated from empty source is successfully recovered.

The pure parser permits uniformly LF or uniformly CRLF wrapper lines, with either no terminal newline or exactly one.
It rejects mixed newlines, bare CR, a BOM and extra whitespace.
However, browser textareas normalize CRLF and CR to LF, so inspection cannot identify the newline format that existed before pasting.
Newlines within the recovered source are preserved separately from this wrapper normalization.
Lone surrogates can be retained in memory as JavaScript strings, but UTF-8 saving replaces them with U+FFFD.
An in-memory recovery match therefore does not guarantee equality after saving a file.

#### Comparing sizes and character frequencies

Sizes distinguish code points, JavaScript UTF-16 code units and UTF-8 bytes measured with `TextEncoder`.
For example, `A😀` has 2 code points, 3 UTF-16 code units and 5 UTF-8 bytes.
The escaped literal body excludes its surrounding quotes.
Quotes, the decoder and other framing syntax belong to the wrapper, so no component is counted twice.
The following values use the Japanese reference sample above with key 3.

<!-- learning-sizes:start -->
| Component | Code points | UTF-16 code units | UTF-8 bytes |
|---|---:|---:|---:|
| Source | 175 | 175 | 225 |
| Shifted payload | 175 | 175 | 225 |
| Escaped literal body | 179 | 179 | 229 |
| Escape expansion | 4 | 4 | 4 |
| Decoder | 199 | 199 | 199 |
| Fixed syntax | 111 | 111 | 111 |
| Key digits | 1 | 1 | 1 |
| Total wrapper | 311 | 311 | 311 |
| Complete snippet | 490 | 490 | 540 |
<!-- learning-sizes:end -->

For each of the three units, source + escape expansion + wrapper = snippet.
The wrapper is decoder 199 + fixed syntax 111 + key digits.
An empty-source snippet has length 311 with a one-digit key and 312 with key 94; it is not always 311.
Ratios are snippet length divided by source length, expressed as percentages, not compression or cryptographic strength.
With empty source, the ratio cannot be defined, so the learning lab shows “—” and an explanation.
The existing output statistics continue to show “undefined”.

Frequency analysis counts every code point in the source and sorts by descending frequency, then ascending numeric code point for ties.
Only the top 20 distinct code points are displayed; the remaining occurrences are grouped as “other”.
Each row maps an original character to its shifted character and shows its count and share of the total.
These values also use the same Japanese sample and key 3.

<!-- learning-stats:start -->
| Metric | Value |
|---|---:|
| Code-point ratio (%) | 280.0 |
| UTF-8 byte ratio (%) | 240.0 |
| Total code points | 175 |
| Distinct code points | 57 |
| Displayed distinct code points | 20 |
| Occurrences of displayed code points | 127 |
| Other occurrences | 48 |
| Unshifted code points | 29 |
| Source entropy (bits/code point) | 5.2597 |
| Shifted payload entropy (bits/code point) | 5.2597 |
<!-- learning-stats:end -->

The ASCII shift is a one-to-one substitution and preserves out-of-range characters, so the frequency-count distribution and entropy do not change.
Entropy compares the source with the directly shifted payload, not the wrapper-containing snippet.
Neither a high value nor invariance establishes safety.
Empty input has entropy 0; its unshifted share is “—” because there is no denominator.

#### Samples and one-step input restore

The six samples are basic (`basic`), ASCII wraparound (`ascii-wrap`), Unicode (`unicode`), escapes (`escapes`), console logs (`console`) and scope (`scope`).
Changing the selection alone does not replace the main input; pressing the load button applies it.
Loading a sample preserves the current key; each sample's recommended key is guidance only.
Clear empties only the source and retains the key, while reset loads the basic sample in the current language and restores key 3.

Immediately before load, clear or reset changes the state, the source, key and sample provenance are captured for one-step restore.
Restore consumes that single saved state; it is not an editing history or redo feature.
An action that leaves the state unchanged does not overwrite the saved state.
Manual source and key changes do not create a new restore point.
An untouched sample is translated when the language changes, but manually edited source is never automatically translated, even if it equals a sample.
Restoring an untouched sample from a different language preserves its source and key and makes it custom input, rather than retranslating it as a current-language sample.
These states and the restore point exist only in memory, never in localStorage.

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

Character counts use Unicode code points. A single-code-point emoji such as 😀 counts as one, but a visually perceived character can contain multiple code points. These values are for the Japanese reference sample shown above with a shift of 3.

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

The character-count ratio is the generated length divided by the original length, expressed as a percentage. It is not a measure of compression. With this example's key 3, empty input produces 311 characters, with the ratio shown as “undefined” in the interface. A Caesar transformation preserves character frequencies, so an entropy increase cannot serve as evidence of protection or as a dependable detector for this transformation.

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

Learning tests also cover accepted and rejected fixed formats, non-executing recovery, size decomposition, frequencies, limits, the six samples, one-step input restore, learning-result invalidation and the independent inspector.
The new numeric tables are checked against both the fixed values in `test/fixtures/learning-expect.json` and recalculated `LearningCore` results.

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
assets/en/screenshot.png             # English normal view in the light theme
assets/en/screenshot2.png            # English learning lab in the light theme
assets/screenshot.png                # Japanese normal view in the light theme
assets/screenshot2.png               # Japanese learning lab in the dark theme
assets/screenshot3.png               # Japanese non-executing recovery in the light theme
index.html                           # Interface structure and parent CSP
js/                                  # Shared modules
js/editor-state.js                   # Input provenance and one-step restore
js/i18n.js                           # Japanese/English messages and language preferences
js/learning-core.js                  # Non-executing inspection, traces, sizes and frequencies
js/learning-ui.js                    # Learning views, invalidation and the independent inspector
js/obfuscator-core.js                # DOM-independent transformation, validation and statistics
js/samples.js                        # Six bilingual samples with stable IDs
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
test/editor-state.test.js            # Sample, language and restore state transitions
test/fixtures/                       # Fixed reference data
test/fixtures/expect.json            # Reference outputs and known answers
test/fixtures/learning-expect.json   # Fixed reference values for learning helpers
test/format.test.js                  # UTF-8, line lengths and readable formatting
test/html.test.js                    # CSP, HTML, ARIA and local assets
test/i18n.test.js                    # Language dictionaries and display parity
test/learning-core.test.js           # Non-executing inspection and pure learning helpers
test/readme.test.js                  # Examples, statistics, metadata and document structure
test/samples.test.js                 # Fixed sample data, syntax and benign behavior
test/sandbox.test.js                 # Isolation and message validation
test/security.test.js                # Detection patterns, statistics and entropy consistency
test/snippet.test.js                 # Execution, escaping and scope
test/ui.test.js                      # Clipboard waits and interface state changes
```
<!-- inventory:end -->

## 💻 Requirements

The tool targets current Chrome, Edge, Firefox and Safari with JavaScript enabled. It uses no build system, CDN or external API. Clipboard and download permissions may depend on the browser and its settings.

| How the page is opened | Generate, learn, recover without execution, copy and save | In-page execution |
|---|---|---|
| HTTP/HTTPS | Available | Available in a sandbox iframe |
| `file://` | Available | Disabled; an HTTP-opening instruction is displayed |

If the Clipboard API is unavailable, the tool tries selection-based copying and otherwise leaves the output selected for manual copying. Saving uses the browser's download feature. Disabling execution for `file://` is this tool's compatibility policy.

### Opening a local HTTP server

If Python 3 is available, run the following command from the repository root:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/) in the browser. Press Ctrl+C in the terminal to stop the server. Opening `index.html` directly also supports generation, learning and non-executing recovery.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🛠️ About this tool

This tool was developed as part of the **100 Security Tools with Generative AI** project.
The project uses generative AI assistance to create and publish security-related tools over a period of 100 days.

For project details and other tools, see:

🔗 [https://akademeia.info/?page_id=42163](https://akademeia.info/?page_id=42163)
