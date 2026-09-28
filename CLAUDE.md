# CLAUDE.md

This file provides guidance to coding agents working in this repository.

## Project Overview

Classic JS Obfuscator is a web-based tool that generates self-decrypting JavaScript snippets using classical cryptography (Caesar cipher). The tool creates obfuscated JavaScript code that can decrypt and execute itself using an embedded decryption function.

## Architecture

This is a simple static web application with no build system or dependencies:

- **index.html**: Accessible tab-based UI, result area, dialogs, and parent-page CSP (Caesar implemented, Vigenère placeholder)
- **script.js**: DOM events, editor-state transitions, strict key validation, output freshness, learning integration, copy/download actions, dialogs, and settings initialization
- **js/obfuscator-core.js**: DOM-free Caesar conversion, string escaping, key parsing, snippet generation, code-point statistics, and entropy; classic-script global `ObfuscatorCore` plus CommonJS export
- **js/learning-core.js**: Pure fixed-format inspection, exact source comparison, transformation traces, size decomposition and frequencies; classic global `LearningCore` and CommonJS, reusing `ObfuscatorCore`
- **js/learning-ui.js**: Text-only learning views, generated-result invalidation and an independent non-executing inspector; classic global `LearningUI` and CommonJS
- **js/samples.js**: Six frozen bilingual sample definitions and stable IDs; classic global `Samples` and CommonJS
- **js/editor-state.js**: Immutable input, raw key, sample provenance and a single consumable restore point; classic global `EditorState` and CommonJS
- **js/i18n.js**: Japanese/English UI dictionaries and language switching
- **js/sandbox-runner.js**: Fresh iframe lifecycle, ready handshake, source/origin/run-ID validation, and bounded result messages
- **sandbox/runner.html**, **sandbox/runner.js**, **sandbox/runner.css**: Isolated execution document with its own CSP and result DOM
- **style.css**: Mobile-first layouts, theme colors, focus styles, and reduced-motion support
- **test/**: Dependency-free Node tests and immutable reference fixtures `test/fixtures/expect.json` and `test/fixtures/learning-expect.json`
- **.github/workflows/test.yml**: Node 22 tests for pushes and pull requests
- **README.md**, **README.en.md**, **SECURITY.md**: User instructions and the documented security boundary

## Key Implementation Details

The obfuscation process:
1. Original JavaScript code is encrypted using Caesar cipher (shift within ASCII visible range 32-126)
2. A minimal runtime decryption function is embedded in the output
3. The final output is an IIFE that decrypts the payload and uses indirect `(0, eval)` evaluation in its execution context

- Shift range: 0-94 (95 printable ASCII characters)
- Non-ASCII characters (e.g., Japanese text, emojis) pass through unchanged
- Empty, fractional, exponential, negative, non-ASCII-digit, and out-of-range keys are invalid; zero is an explicit no-op key
- Escape raw `<` in the payload string, control characters, U+2028, and U+2029. Do not change the embedded decoder string: its comparison operators remain literal `<`
- Count displayed statistics by Unicode code point, not grapheme: 😀 is one code point, while some visible characters contain several; the empty-input ratio is `null`
- Keep the reference sample and expected output exact; do not change fixture values to make a test pass
- Changing input, key, view, or language invalidates output; run/copy/download must use output generated from the current state
- Non-strict top-level functions and `var` declarations can become global in the execution context; lexical declarations and strict-mode evaluation have different scope

### Learning and editor-state contracts

Keep `js/obfuscator-core.js` and its canonical generated format unchanged. `LearningCore` uses that core rather than duplicating the shift, escaping or generator. The learning fixture is the checked-in result of the supplied Phase 2 `ref_inspector.cjs`; the six sample definitions originate from the supplied `samples.json`. These authoring references live outside this repository. Runtime code and tests must remain self-contained and must not depend on a developer's workspace path. Do not rewrite either fixture to make a failing implementation pass.

Learning views must use the exact source/key snapshot that produced the current output. Main input, raw key, view, language and load/clear/reset/restore actions clear stale output and all trace/size/frequency rows, including actions that leave the input unchanged. Merely selecting a sample does not replace input or invalidate output. Source analysis accepts at most 100,000 UTF-16 code units without limiting ordinary generation. Trace display is limited to 200 code points and frequency display to 20 distinct code points; frequencies and totals still use all accepted input.

Distinguish code points, UTF-16 code units and `TextEncoder` UTF-8 bytes. Exclude quotes from the literal body, count them in the wrapper and preserve source + escape expansion + wrapper = snippet in all three units. Wrapper overhead is decoder 199 + fixed syntax 111 + key digits; empty output is not always 311. Empty ratios are `null`, shown as a dash plus a reason in the lab and the existing undefined label in output statistics. Lone surrogates stay unchanged in memory but become U+FFFD when encoded for UTF-8 saving. Entropy compares the original source with the shifted payload, not the full snippet; the permutation preserves frequencies and is not a strength metric.

`EditorState` stores `source`, raw `key`, `sampleId`, `pristine`, `sampleLanguage` and `undo`. Load preserves the key, clear empties the source while preserving the key, and reset selects the current-language basic sample with raw key `"3"`. Only changed load/clear/reset operations capture the preceding five-field state; no-ops retain the existing restore point. Restore consumes it once, with no redo. Manual edits do not add restore points, and any source edit makes it custom even if the text matches a sample. Language changes translate only pristine loaded samples. Restoring a pristine sample captured in another language preserves its text/key but makes it custom. Pending sample selection is separate UI state and does not replace input until explicit loading.

The inspector is independent of main editor mutations. Explicit loading requires fresh output, captures its original source in memory, clears all old results and does not inspect automatically. Compare restored source only against that captured source, never the current editor. Manual inspector input, even if unchanged, removes provenance and results. Clear removes input, provenance and results; failure removes prior successful results. Language refresh preserves raw input, raw results and provenance while translating descriptions. Preserve JavaScript string equality without trimming, Unicode normalization or source-newline conversion; mismatch positions are one-based code-point positions in the UI.

Inspection accepts only the exact seven-line canonical envelope, emitted escape grammar and canonical key notation. The pure parser permits uniform LF or CRLF with zero or one terminal newline, rejecting bare CR, mixed newlines, BOMs, extra whitespace, trailing code and decoder changes. Browser textareas normalize CRLF/CR before inspection, so do not claim to detect the pre-paste newline format. The 2,000,000 UTF-16-unit inspection limit applies before pure-parser normalization. Empty inspection input is an error; a canonical empty-source snippet is valid. Format acceptance, source equality, JavaScript syntax validity and safety are distinct concepts.

## Development

- No build process or runtime dependencies: pure vanilla JavaScript
- Run `npm test` with Node 22 or later; `package.json` uses `node --test` and requires no package installation
- Use a local HTTP server for execution checks. Opening `index.html` with `file://` supports generation, learning, non-executing recovery, copying and downloading, but disables the run action
- Check HTTP and `file://`, both languages and themes, and desktop/mobile widths after UI changes
- Browser validation must include stale-output rejection, invalid keys, storage unavailable, keyboard dialogs/tabs, tutorial visibility, and iframe isolation
- Learning tests cover all 95 keys, accepted/rejected envelopes, Unicode and lone surrogates, limit boundaries, size equations, frequency invariance, frozen samples and one-step state transitions
- UI/browser checks must cover both editors, every invalidation path, load provenance, same-text manual input, failure cleanup, language-preserved inspection and forbidden execution paths
- README tests retain the metadata digest and known examples, check all 31 corresponding headings, recalculate every marked learning-table row and validate screenshot/inventory coverage
- Keep source formatted for review; CSS/JavaScript lines are limited to 160 characters and HTML to 250
- Keep `.claude/` ignored and do not commit personal paths, local settings, or code entered during testing
- Uses GitHub Pages for deployment at https://ipusiron.github.io/classic-js-obfuscator/
- The tool is part of the "100 Security Tools with AI" project (Day 042)
- Vigenère cipher tab is intentionally unimplemented (placeholder for future enhancement)

## Security Considerations

This is an educational tool demonstrating classical cryptography for code obfuscation. The generated code uses `eval` for self-execution, which has security implications. The obfuscation provides only readability reduction, not true security - the original code can be recovered through static analysis.

The parent page never dynamically evaluates user code and must not allow `'unsafe-eval'` in its CSP. Only `sandbox/runner.html` permits dynamic evaluation. The iframe has exactly `sandbox="allow-scripts"` without `allow-same-origin`, making its runtime origin opaque even though its URL is hosted on the same site. Parent DOM/storage access is denied by the browser; results cross the boundary only through validated `postMessage` messages.

The learning and inspection paths must never call `eval`, `Function`, string-based timers, sandbox execution or another dynamic-code mechanism. Do not create script/iframe elements or use `innerHTML`, `document.write`, `srcdoc` or executable URLs to render recovered content. Use `textContent` only, retain the raw restored string separately from display labels and never write recovery back into the main editor. A fixed-format match is neither syntax validation nor a safety verdict. Learning/inspection must not relax CSP or sandbox attributes, transmit code, persist it or log its contents.

Use trusted sample code only. The iframe is not a malware-analysis environment or guaranteed CPU isolation. Its five-second response timeout cannot reliably stop a blocking loop. `connect-src 'none'` limits connection APIs but does not guarantee that every navigation or network effect is prevented. Do not claim complete network isolation.

Synchronous console output is captured and temporary console hooks are restored in `finally`. Asynchronous console output is not captured; asynchronous errors and unhandled Promise rejections can still be reported while that iframe remains active. A done message means synchronous evaluation returned, not that all future tasks finished. Each run creates a new iframe and discards the preceding frame.

The execution input limit is 2,000,000 UTF-16 code units. Log and error messages are each limited to 100 per run and each message to 4,000 UTF-16 code units. Treat these as resource limits, not security guarantees.

The application stores only theme and language preferences in localStorage, never input code or generated output. Storage reads and writes must tolerate failure. Keep detailed source-code and user-agent logging out of the parent page.
