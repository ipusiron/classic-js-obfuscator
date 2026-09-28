"""Self-contained Chromium checks. Only synthetic inputs; no real clipboard access."""
import argparse
import functools
import http.server
import json
import os
import tempfile
import datetime
import threading
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
QUESTIONS = json.loads((ROOT / "test/fixtures/phase3-expect.json").read_text(encoding="utf-8"))["questions"]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def check_quiz(page, language):
    page.locator("#quiz-title").click()
    expect(page.locator("#btn-quiz-grade")).to_be_disabled()
    page.locator("#quiz-choice-b").check()
    page.locator("#btn-quiz-next").click()
    page.locator("#btn-quiz-prev").click()
    expect(page.locator("#quiz-choice-b")).to_be_checked()
    for index, question in enumerate(QUESTIONS):
        expect(page.locator("#quiz-question")).to_have_text(question["prompt"][language])
        page.locator("#quiz-choice-" + question["answerId"]).check()
        page.locator("#btn-quiz-grade").click()
        expect(page.locator("#btn-quiz-grade")).to_be_disabled()
        expect(page.locator("#quiz-progress")).to_have_attribute("data-correct", str(index + 1))
        expect(page.locator("#quiz-explanation")).to_have_text(question["explanation"][language])
        if index < 11:
            page.locator("#btn-quiz-next").click()
    page.locator("#language-btn").click()
    expect(page.locator("#quiz-progress")).to_have_attribute("data-correct", "12")
    page.locator("#language-btn").click()
    page.locator("#inputCode").fill("// custom trusted marker")
    page.locator("#key").fill("003")
    page.locator("#btn-generate").click()
    page.locator("#btn-quiz-load").click()
    expect(page.locator("#outputCode")).to_have_value("")
    expect(page.locator("#key")).to_have_value("003")
    page.locator("#btn-restore-input").click()
    expect(page.locator("#inputCode")).to_have_value("// custom trusted marker")
    page.locator("#btn-quiz-reset").click()
    expect(page.locator("#quiz-progress")).to_have_attribute("data-answered", "0")
    expect(page.locator("#quiz-explanation")).to_be_hidden()
    assert page.locator("iframe").count() == 0
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")


def check_baseline(page, protocol, language):
    fixture = json.loads((ROOT / "test/fixtures/expect.json").read_text(encoding="utf-8"))
    page.locator("#inputCode").fill(fixture["sample"])
    page.locator("#key").fill("3")
    page.locator("#btn-generate").click()
    # The fixed fixture's original seven-line snippet remains the source of truth.
    expect(page.locator("#outputCode")).to_have_value(fixture["sample_snippet_3"])
    page.locator("#key").fill("")
    expect(page.locator("#btn-generate")).to_be_disabled()
    expect(page.locator("#outputCode")).to_have_value("")
    page.locator("#key").fill("003")
    for sample_id in ("basic", "ascii-wrap", "unicode", "escapes", "console", "scope"):
        page.locator("#sample-select").select_option(sample_id)
        before = page.locator("#inputCode").input_value()
        page.locator("#btn-load-sample").click()
        expect(page.locator("#key")).to_have_value("003")
        page.locator("#btn-generate").click()
        page.locator("#btn-inspect-load").click()
        page.locator("#btn-inspect").click()
        expect(page.locator("#inspect-comparison")).to_have_attribute("data-state", "equal")
        assert page.locator("#inspect-source").evaluate("e => e.textContent") == page.locator("#inputCode").input_value()
        page.locator("#btn-restore-input").click()
        expect(page.locator("#inputCode")).to_have_value(before)
    page.locator("#btn-reset-input").click()
    page.locator("#btn-generate").click()
    if protocol == "file":
        expect(page.locator("#btn-run")).to_be_disabled()
    else:
        page.locator("#btn-run").click()
        expect(page.locator("#run-result")).to_contain_text("Hello Obfuscation!")
        first = page.locator("#run-host iframe").element_handle()
        assert first.get_attribute("sandbox") == "allow-scripts"
        page.locator("#btn-run").click()
        expect(page.locator("#run-result")).to_contain_text("Hello Obfuscation!")
        assert not first.evaluate("e => e.isConnected")
    page.locator("#key").fill("4")
    assert page.locator("iframe").count() == 0
    page.locator("#btn-inspect-clear").click()
    page.locator("#help-btn").click()
    expect(page.locator("#help-modal")).to_be_visible()
    page.keyboard.press("Escape")
    expect(page.locator("#help-btn")).to_be_focused()
    page.locator("#tab-button-caesar").focus()
    page.keyboard.press("ArrowRight")
    expect(page.locator("#tab-button-vigenere")).to_have_attribute("aria-selected", "true")
    page.keyboard.press("Home")
    expect(page.locator("#tab-button-caesar")).to_have_attribute("aria-selected", "true")


def check_presentation(page, language):
    page.locator("#btn-quiz-reset").click()
    page.locator("#quiz-choice-a").focus()
    page.keyboard.press("ArrowRight")
    expect(page.locator("#quiz-choice-b")).to_be_checked()
    page.keyboard.press("ArrowLeft")
    expect(page.locator("#quiz-choice-a")).to_be_checked()
    assert page.locator(".quiz-choice").first.evaluate("e => parseFloat(getComputedStyle(e).minHeight)") >= 44
    assert page.locator(".quiz-choice").first.evaluate("e => getComputedStyle(e).outlineStyle") != "none"
    for target in ("#reference-input", "#share-url"):
        assert page.locator(target).evaluate("e => parseFloat(getComputedStyle(e).fontSize)") >= 16
    contrast = page.locator(".quiz-choice").first.evaluate("""element => {
        const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
        const light = color => color.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
            .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
        const ratio = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        const style = getComputedStyle(element), bg = light(rgb(style.backgroundColor));
        return {text: ratio(light(rgb(style.color)), bg), border: ratio(light(rgb(style.borderColor)), bg)};
    }""")
    assert contrast["text"] >= 4.5 and contrast["border"] >= 3, contrast
    page.locator(".quiz-choice").first.hover()
    assert page.locator(".quiz-choice").first.evaluate("e => getComputedStyle(e).opacity") == "1"
    if language == "en":
        japanese = page.evaluate("""() => {
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            const hits = [];
            while (walker.nextNode()) {
                const node = walker.currentNode;
                if (node.parentElement.closest('script,style,noscript,textarea,#inspect-source,.context-token')) continue;
                if (/[\u3040-\u30ff\u3400-\u9fff]/u.test(node.textContent)) hits.push(node.parentElement.id || node.parentElement.tagName);
            }
            for (const node of document.querySelectorAll('[aria-label], [title]')) {
                if (/[\u3040-\u30ff\u3400-\u9fff]/u.test((node.getAttribute('aria-label') || '') + (node.title || ''))) hits.push(node.id);
            }
            return hits;
        }""")
        assert not japanese, japanese
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")


def check_initial_fragment(browser, url, language):
    context = browser.new_context(locale=language)
    try:
        page = context.new_page()
        target = "en" if language == "ja" else "ja"
        page.goto(url + f"?lang={language}#cjo=v1&sample=unicode&key=94&lang={target}&view=compare")
        expect(page.locator("#share-pending")).to_be_visible()
        expect(page.locator("html")).to_have_attribute("lang", language)
        expect(page.locator("#key")).to_have_value("3")
        expect(page.locator("#btn-normal-view")).to_have_attribute("aria-pressed", "true")
        assert page.locator("iframe").count() == 0
    finally:
        context.close()


def run_case(browser, url, protocol, language, theme, width, blocked=False, report_dir=None):
    context = browser.new_context(viewport={"width": width, "height": 844},
                                  is_mobile=width <= 390, locale=language, reduced_motion="reduce")
    errors, external = [], []
    case_id = f"{protocol}-{language}-{theme}-{width}-storage-{int(blocked)}"
    page = None
    try:
        def route_request(route):
            parts = urlsplit(route.request.url)
            if parts.scheme in ("http", "https") and parts.hostname != "127.0.0.1":
                external.append(parts.hostname)
                route.abort()
            else:
                route.continue_()
        context.route("**/*", route_request)
        context.add_init_script("""window.__csp = []; window.__storageWrites = [];
            document.addEventListener('securitypolicyviolation', e => __csp.push(e.effectiveDirective));
            Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{writeText:async()=>{throw Error('test denial')}}});
        """)
        context.add_init_script("""(() => {
            const denied = BLOCKED;
            const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
            Storage.prototype.getItem = function(key) {if (denied) throw Error('test denial'); return get.call(this, key)};
            Storage.prototype.setItem = function(key, value) {
                window.__storageWrites.push(key); if (denied) throw Error('test denial'); return set.call(this, key, value);
            };
        })()""".replace("BLOCKED", "true" if blocked else "false"))
        page = context.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.goto(url + "?lang=" + language)
        page.evaluate("theme => window.setTheme(theme)", theme)
        check_baseline(page, protocol, language)
        check_quiz(page, language)
        check_share(page, language)
        check_reference(page, language)
        check_presentation(page, language)
        assert not errors, errors
        assert not external, external
        assert not page.evaluate("__csp")
        assert set(page.evaluate("__storageWrites")) <= {"theme", "language"}
        record = {"case": case_id, "ok": True, "console_errors": 0, "page_errors": 0,
                  "csp_violations": 0, "external_requests": 0, "overflow": False}
        print(json.dumps(record), flush=True)
        return record
    except Exception:
        if report_dir and page:
            # Only this harness's known synthetic cases are captured; never profile/environment data.
            page.screenshot(path=str(report_dir / (case_id + ".png")), full_page=False)
        raise
    finally:
        context.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--full", action="store_true", help="Use 320, 390, 768 and 1280px instead of the CI pair")
    args = parser.parse_args()
    report_dir = Path(os.environ.get("BROWSER_REPORT_DIR") or tempfile.mkdtemp(prefix="day042-browser-"))
    report_dir = report_dir.resolve()
    if report_dir == ROOT or ROOT in report_dir.parents:
        raise ValueError("Reports must be outside the repository")
    report_dir.mkdir(parents=True, exist_ok=True)
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    records = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            version = browser.version
            try:
                urls = {"http": f"http://127.0.0.1:{server.server_port}/", "file": (ROOT / "index.html").as_uri()}
                for protocol, url in urls.items():
                    for language in ("ja", "en"):
                        check_initial_fragment(browser, url, language)
                        for theme in ("light", "dark"):
                            for width in ((320, 390, 768, 1280) if args.full else (320, 1280)):
                                records.append(run_case(browser, url, protocol, language, theme, width, report_dir=report_dir))
                        records.append(run_case(browser, url, protocol, language, "dark", 320, True, report_dir))
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
    report = {"checked_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "browser": version, "full": args.full, "initial_fragment_cases": 4, "cases": records}
    (report_dir / "result.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"passed": len(records), "initial_fragment_cases": 4, "report": str(report_dir / "result.json")}))


def check_share(page, language):
    page.locator("#share-title").click()
    page.locator("#inputCode").fill("// DO_NOT_SHARE")
    page.locator("#sample-select").select_option("unicode")
    page.locator("#key").fill("003")
    page.locator("#btn-share-create").click()
    expected = ("https://ipusiron.github.io/classic-js-obfuscator/"
                f"#cjo=v1&sample=unicode&key=3&lang={language}&view=normal")
    expect(page.locator("#share-url")).to_have_value(expected)
    page.evaluate("Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{writeText:async()=>{throw Error('denied')}}})")
    page.locator("#btn-share-copy").click()
    expect(page.locator("#share-status")).to_have_text(page.evaluate("ObfuscatorI18n.t('shareCopyManual')"))
    for succeeds in (True, False):
        page.locator("#btn-share-create").click()
        page.evaluate("""Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{
            writeText: () => new Promise((resolve, reject) => {window.__copyResolve = resolve; window.__copyReject = reject})
        }})""")
        page.locator("#btn-share-copy").click()
        page.locator("#inputCode").fill("// changed during copy")
        status = page.locator("#share-status").text_content()
        page.evaluate("success => success ? __copyResolve() : __copyReject(Error('late denial'))", succeeds)
        expect(page.locator("#share-url")).to_have_value("")
        expect(page.locator("#share-status")).to_have_text(status)
        page.locator("#inputCode").fill("// DO_NOT_SHARE")
    page.locator("#key").fill("bad raw key")
    expect(page.locator("#share-url")).to_have_value("")
    target_language = "en" if language == "ja" else "ja"
    fragment = f"#cjo=v1&sample=escapes&key=94&lang={target_language}&view=compare"
    page.evaluate("hash => {location.hash = hash}", fragment)
    expect(page.locator("#share-pending")).to_be_visible()
    expect(page.locator("#inputCode")).to_have_value("// DO_NOT_SHARE")
    expect(page.locator("html")).to_have_attribute("lang", language)
    page.locator("#btn-share-apply").click()
    expect(page.locator("html")).to_have_attribute("lang", target_language)
    expect(page.locator("#btn-compare-view")).to_have_attribute("aria-pressed", "true")
    expect(page.locator("#key")).to_have_value("94")
    expect(page.locator("#outputCodeCompare")).to_have_value("")
    page.locator("#btn-restore-input").click()
    expect(page.locator("#inputCodeCompare")).to_have_value("// DO_NOT_SHARE")
    expect(page.locator("#key")).to_have_value("bad raw key")
    page.evaluate("hash => {location.hash = hash + '&code=NO_DISPLAY'}", fragment)
    expect(page.locator("#share-error")).not_to_be_empty()
    expect(page.locator("#share-pending")).to_be_hidden()
    page.go_back()
    expect(page.locator("#share-pending")).to_be_visible()
    expect(page.locator("#inputCodeCompare")).to_have_value("// DO_NOT_SHARE")
    page.locator("#btn-share-dismiss").click()
    expect(page.locator("#share-pending")).to_be_hidden()
    page.go_forward()
    expect(page.locator("#share-error")).not_to_be_empty()
    assert page.locator("iframe").count() == 0
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    page.locator("#btn-normal-view").click()
    page.locator("#language-btn").click()


def check_reference(page, language):
    page.locator("#key").fill("3")
    page.locator("#inputCode").fill("A😀B")
    page.locator("#btn-generate").click()
    page.locator("#btn-inspect-load").click()
    page.locator("#btn-inspect").click()
    expect(page.locator("#inspect-comparison")).to_have_attribute("data-state", "equal")
    expect(page.locator("#btn-reference-compare")).to_be_disabled()
    page.locator("#reference-input").fill("A😀C")
    page.locator("#btn-reference-compare").click()
    expect(page.locator("#reference-status")).to_have_attribute("data-code-point-index", "2")
    expect(page.locator("#context-panels")).to_be_visible()
    assert page.locator("#context-source li").count() == 3
    page.locator("#language-btn").click()
    expect(page.locator("#reference-status")).to_have_attribute("data-code-point-index", "2")
    page.locator("#language-btn").click()
    page.locator("#inputCode").fill("main changed")
    expect(page.locator("#reference-input")).to_have_value("A😀C")
    expect(page.locator("#reference-status")).to_have_attribute("data-state", "different")
    page.locator("#reference-input").fill("")
    expect(page.locator("#btn-reference-compare")).to_be_enabled()
    page.locator("#btn-reference-compare").click()
    expect(page.locator("#context-source")).to_contain_text("EOF")
    page.locator("#btn-reference-clear").click()
    expect(page.locator("#btn-reference-compare")).to_be_disabled()
    expect(page.locator("#inspect-source")).to_have_text("A😀B")
    page.locator("#btn-reference-load").click()
    expect(page.locator("#reference-input")).to_have_value("main changed")
    page.locator("#btn-reference-compare").click()
    page.locator("#inspect-input").fill("invalid snippet")
    page.locator("#btn-inspect").click()
    expect(page.locator("#context-panels")).to_be_hidden()
    expect(page.locator("#reference-input")).to_have_value("main changed")
    page.evaluate("""() => {
        const field = document.getElementById('inspect-input');
        field.value = ObfuscatorCore.buildSnippet('A\\r\\nB', 3);
        field.dispatchEvent(new Event('input', {bubbles:true}));
    }""")
    page.locator("#btn-inspect").click()
    assert page.locator("#inspect-source").evaluate("e => e.textContent") == "A\r\nB"
    page.locator("#reference-input").fill("A\nB")
    page.locator("#btn-reference-compare").click()
    expect(page.locator("#reference-status")).to_have_attribute("data-code-point-index", "1")
    assert page.locator("iframe").count() == 0
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")


if __name__ == "__main__":
    main()
