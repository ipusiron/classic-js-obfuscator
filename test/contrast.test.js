"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "../style.css"), "utf8");
const rules = [];
for (const match of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const declarations = Object.fromEntries(match[2].split(";").map((entry) => {
    const colon = entry.indexOf(":");
    return colon < 0 ? [] : [entry.slice(0, colon).trim(), entry.slice(colon + 1).trim()];
  }).filter((entry) => entry.length === 2));
  for (const selector of match[1].split(",")) rules.push([selector.trim(), declarations]);
}

function declarations(selector) {
  return Object.assign({}, ...rules.filter(([name]) => name === selector).map(([, value]) => value));
}

function palette(theme) {
  return { ...declarations(":root"), ...(theme === "light" ? declarations('[data-theme="light"]') : {}) };
}

function resolve(value, variables) {
  assert.equal(typeof value, "string", "the CSS property must exist");
  return value.replace(/var\((--[\w-]+)\)/g, (_whole, name) => {
    assert.ok(variables[name], `unknown CSS variable ${name}`);
    return variables[name];
  });
}

function color(value) {
  if (/^#[0-9a-f]{6}$/i.test(value)) {
    return [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16)).concat(1);
  }
  if (/^#[0-9a-f]{3}$/i.test(value)) return color("#" + [...value.slice(1)].map((part) => part + part).join(""));
  const rgba = value.match(/^rgba?\(([^)]+)\)$/);
  assert.ok(rgba, `unsupported CSS color ${value}`);
  const channels = rgba[1].split(",").map(Number);
  return channels.length === 3 ? channels.concat(1) : channels;
}

function over(foreground, background) {
  return foreground.slice(0, 3).map((channel, index) =>
    channel * foreground[3] + background[index] * (1 - foreground[3])).concat(1);
}

function luminance(channels) {
  const linear = channels.slice(0, 3).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function ratio(foreground, background) {
  const values = [luminance(over(foreground, background)), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function backgrounds(value, variables, behind) {
  const resolved = resolve(value, variables);
  const colors = resolved.match(/#[0-9a-f]{3,6}\b|rgba?\([^)]+\)/gi);
  assert.ok(colors?.length, `missing CSS background colors in ${resolved}`);
  return colors.map((entry) => over(color(entry), behind));
}

function styles(selectors, theme) {
  const base = Object.assign({}, ...selectors.map(declarations));
  if (theme === "light") {
    Object.assign(base, ...selectors.map((selector) => declarations('[data-theme="light"] ' + selector)));
  }
  return base;
}

function checkPair(label, foreground, backgroundList, variables) {
  const fg = color(resolve(foreground, variables));
  for (const background of backgroundList) {
    const actual = ratio(fg, background);
    assert.ok(actual >= 4.5, `${label}: ${actual.toFixed(2)}:1 is below 4.5:1`);
  }
}

for (const theme of ["dark", "light"]) {
  test(`${theme} theme text and both button gradient endpoints have at least 4.5:1 contrast`, () => {
    const variables = palette(theme);
    const page = color(variables["--bg"]);
    const card = color(variables["--card"]);
    checkPair("body", variables["--text"], [page, card], variables);
    checkPair("muted labels and placeholders", variables["--muted"], [page, card], variables);
    const sampleSelect = declarations(".sample-panel select");
    checkPair("sample select", sampleSelect.color, backgrounds(sampleSelect.background, variables, card), variables);
    const vigenereInput = declarations(".vig-layout input");
    checkPair("Vigenere input", vigenereInput.color, backgrounds(vigenereInput.background, variables, card), variables);
    checkPair("Vigenere learning links", declarations(".vig-links a").color, [card], variables);
    const learningBackgrounds = [card, color(variables["--input-bg"])];
    for (const selector of [".learning-lab", ".lab-status", ".lab-row", ".lab-pair dt", ".lab-pair dd", ".lab-formula"]) {
      checkPair(selector, declarations(selector).color, learningBackgrounds, variables);
    }
    checkPair("learning warning", declarations(".lab-warning").color, [card], variables);
    checkPair("inspection error", declarations(".inspect-error").color, [card], variables);
    const restored = declarations(".inspect-source");
    checkPair("restored code", restored.color, backgrounds(restored.background, variables, card), variables);
    const summary = declarations(".lab-details > summary:hover");
    checkPair("learning disclosure hover", summary.color, backgrounds(summary.background, variables, card), variables);
    checkPair("help headings and links", variables["--accent-2"], [page, card], variables);
    checkPair("help secondary headings and hovered links", variables["--accent"], [page, card], variables);

    const controls = [
      ["button"],
      ["button", "button#btn-run"],
      ["button", "button#btn-copy"],
      ["button", "button#btn-download"],
      ["button", ".help-btn"],
      ["button", ".theme-toggle-btn"],
      ["button", ".tutorial-start-btn"],
      ["button", ".tab-button"],
      ["button", ".tab-button", ".tab-button:hover"],
      ["button", ".tab-button", ".tab-button.active"],
      ["button", ".view-btn"],
      ["button", ".view-btn", ".view-btn:hover"],
      ["button", ".view-btn", ".view-btn.active"],
      ["button", ".tutorial-btn"],
      ["button", ".tutorial-btn", ".tutorial-btn:hover"],
      ["button", ".tutorial-btn", ".tutorial-btn-primary"],
      ["button", ".tutorial-btn", ".tutorial-btn-primary", ".tutorial-btn-primary:hover"],
      ["button", ".tutorial-close"],
      ["button", ".tutorial-close", ".tutorial-close:hover"],
      ["button", ".help-close"],
      ["button", ".help-close", ".help-close:hover"],
      [".toast"],
      [".toast", ".toast.error"],
    ];
    for (const selectors of controls) {
      const actual = styles(selectors, theme);
      checkPair(selectors.at(-1), actual.color, backgrounds(actual.background, variables, card), variables);
    }
    for (const [backgroundSelector, foregroundSelector] of [
      [".tutorial-header", ".tutorial-header span"],
      [".help-header", ".help-header h2"],
    ]) {
      const actual = styles([backgroundSelector, foregroundSelector], theme);
      checkPair(foregroundSelector, actual.color, backgrounds(actual.background, variables, card), variables);
    }
  });

  test(`${theme} warning overlays, nested code, errors and input colors meet 4.5:1 contrast`, () => {
    const variables = palette(theme);
    const card = color(variables["--card"]);
    const warnings = backgrounds(declarations("details.warn").background, variables, card);
    for (const selector of ["details.warn summary", "details.warn summary:hover", "details.warn ul"]) {
      checkPair(selector, styles([selector], theme).color, warnings, variables);
    }
    const codeStyle = styles(["details.warn code"], theme);
    for (const behind of warnings) {
      checkPair("warning code", codeStyle.color, backgrounds(codeStyle.background, variables, behind), variables);
    }
    for (const [backgroundSelector, foregroundSelector] of [
      [".error-message", ".error-message"],
      [".warning-box", ".warning-box h4"],
      [".tutorial-content code", ".tutorial-content"],
    ]) {
      const actual = styles([backgroundSelector, foregroundSelector], theme);
      checkPair(foregroundSelector, actual.color, backgrounds(actual.background, variables, card), variables);
    }
    for (const selector of ["#key", "textarea"]) {
      const actual = styles([selector], theme);
      checkPair(selector, actual.color, backgrounds(actual.background, variables, card), variables);
      const focused = styles([selector, selector + ":focus"], theme);
      checkPair(selector + " focused", focused.color, backgrounds(focused.background, variables, card), variables);
    }
  });
}

test("hover and disabled controls do not dim their verified text contrast", () => {
  assert.doesNotMatch(css, /brightness\(|grayscale\(/);
  assert.equal(declarations("button:disabled").opacity, "1");
  assert.equal(declarations(".tutorial-btn:disabled").opacity, "1");
  assert.equal(declarations(".footer a:hover").opacity, "1");
});

test("quiz and comparison text, borders and keyboard focus meet contrast thresholds in both themes", () => {
  for (const theme of ["light", "dark"]) {
    const variables = palette(theme);
    const background = color(variables["--input-bg"]);
    for (const selector of [".quiz-choice", ".context-token"]) {
      checkPair(selector, declarations(selector).color, [background], variables);
    }
    for (const selector of [".quiz-choice", ".quiz-choices", ".reference-panel textarea", "#share-url"]) {
      const border = color(resolve(declarations(selector)["border-color"], variables));
      assert.ok(ratio(border, background) >= 3, `${theme} ${selector} border`);
    }
    assert.ok(ratio(color(variables["--accent-2"]), background) >= 3, `${theme} focus and mismatch marker`);
    assert.equal(declarations(".quiz-choice:focus-within").outline, "3px solid var(--accent-2)");
  }
});

test("theme colors change together without low-contrast intermediate transition colors", () => {
  for (const [selector, actual] of rules) {
    if (!actual.transition) continue;
    assert.doesNotMatch(actual.transition, /(?:^|,)\s*(?:all|color|background(?:-color)?)\b/,
      `${selector} must not interpolate text or background during theme changes`);
  }
  const reducedMotion = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(reducedMotion, "reduced motion media query exists");
  assert.match(reducedMotion[1], /transition:\s*none\s*!important/);
  assert.match(reducedMotion[1], /animation:\s*none\s*!important/);
});
