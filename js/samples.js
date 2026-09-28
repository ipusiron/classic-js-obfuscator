/* Checked-in teaching data; importing or selecting a sample never executes it. */
(function (root, factory) {
  "use strict";

  const samples = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = samples;
  } else {
    root.Samples = samples;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const data = {
    "schemaVersion": 1,
    "loadingPolicy": {
      "replaceSourceOnly": true,
      "preserveCurrentShift": true,
      "recommendedShiftIsInformationalOnly": true,
      "executeOnLoad": false,
      "executionTarget": "Only the existing fresh HTTP(S) sandbox when the user explicitly runs trusted code."
    },
    "samples": [
      {
        "id": "basic",
        "recommendedShift": 3,
        "ja": {
          "name": "基本サンプル",
          "description": "既存サンプルと同じです。ログと実行画面への段落追加を観察します。推奨シフト3は参考値で、読み込み時に鍵は変えません。",
          "source": "// サンプル：実行結果の欄に \"Hello Obfuscation!\" を表示する\nconsole.log(\"Hello Obfuscation!\");\nconst p = document.createE" +
          "lement(\"p\");\np.textContent = \"✅ 実行されました\";\ndocument.body.appendChild(p);",
          "expected": {
            "consoleCalls": [
              {
                "method": "log",
                "args": [
                  "Hello Obfuscation!"
                ]
              }
            ],
            "domAppend": [
              {
                "tag": "p",
                "text": "✅ 実行されました"
              }
            ],
            "observation": "既存のJAサンプル本文と完全一致します。実行すると1件のログと1個のp要素が出力されます。"
          }
        },
        "en": {
          "name": "Basic sample",
          "description": "The existing sample: observe a log and an appended paragraph. Suggested shift 3 is informational; loading pres" +
          "erves the current shift.",
          "source": "// Sample: display \"Hello Obfuscation!\" in the execution results\nconsole.log(\"Hello Obfuscation!\");\ncons" +
          "t p = document.createElement(\"p\");\np.textContent = \"✅ Code executed\";\ndocument.body.appendChild(p);",
          "expected": {
            "consoleCalls": [
              {
                "method": "log",
                "args": [
                  "Hello Obfuscation!"
                ]
              }
            ],
            "domAppend": [
              {
                "tag": "p",
                "text": "✅ Code executed"
              }
            ],
            "observation": "The source exactly matches the existing English sample. Execution emits one log and appends one p element."
          }
        }
      },
      {
        "id": "ascii-wrap",
        "recommendedShift": 94,
        "ja": {
          "name": "ASCII境界の折り返し",
          "description": "空白とチルダのASCII境界を観察します。推奨シフト94は参考値で、読み込み時に鍵は変えません。",
          "source": "console.log(\" ~\");",
          "expected": {
            "consoleCalls": [
              {
                "method": "log",
                "args": [
                  " ~"
                ]
              }
            ],
            "domAppend": [],
            "observation": "対象95文字の空白32とチルダ126は、シフト94で126と125になります。復号して実行したログは元の空白＋チルダです。"
          }
        },
        "en": {
          "name": "ASCII boundary wrap",
          "description": "Observe space and tilde at the ASCII boundaries. Suggested shift 94 is informational; loading preserves the cu" +
          "rrent shift.",
          "source": "console.log(\" ~\");",
          "expected": {
            "consoleCalls": [
              {
                "method": "log",
                "args": [
                  " ~"
                ]
              }
            ],
            "domAppend": [],
            "observation": "Across the 95-character range, code units 32 and 126 shift by 94 to 126 and 125. Decoded execution logs the or" +
            "iginal space and tilde."
          }
        },
        "caesarProbe": {
          "input": " ~",
          "shift": 94,
          "shifted": "~}",
          "inputCodeUnits": [
            32,
            126
          ],
          "shiftedCodeUnits": [
            126,
            125
          ]
        }
      },
      {
        "id": "unicode",
        "recommendedShift": 3,
        "ja": {
          "name": "Unicodeと結合文字",
          "description": "日本語・絵文字・結合文字を日英共通のテストデータとして観察します。推奨シフト3は参考値で、読み込み時に鍵は変えません。",
          "source": "console.log(\"日本語 😀 é\");",
          "expected": {
            "consoleCalls": [
              {
                "method": "log",
                "args": [
                  "日本語 😀 é"
                ]
              }
            ],
            "domAppend": [],
            "observation": "日本語・絵文字・結合アクセントはシフト対象外です。ASCIIの空白とeは対象ですが、復号した結果は元の文字列と一致します。"
          }
        },
        "en": {
          "name": "Unicode and combining marks",
          "description": "Japanese text, an emoji, and a combining mark are intentional shared test data. Suggested shift 3 is informati" +
          "onal; loading preserves the current shift.",
          "source": "console.log(\"日本語 😀 é\");",
          "expected": {
            "consoleCalls": [
              {
                "method": "log",
                "args": [
                  "日本語 😀 é"
                ]
              }
            ],
            "domAppend": [],
            "observation": "Japanese characters, the emoji, and the combining acute accent pass through. ASCII spaces and e are shifted; d" +
            "ecoded execution restores the original string."
          }
        },
        "sharedTestData": {
          "identicalAcrossLanguages": true,
          "stringCodePoints": [
            26085,
            26412,
            35486,
            32,
            128512,
            32,
            101,
            769
          ]
        }
      },
      {
        "id": "escapes",
        "recommendedShift": 0,
        "ja": {
          "name": "引用符とバックスラッシュ",
          "description": "引用符・バックスラッシュ・ソースの改行と文字列内の改行エスケープを区別します。推奨シフト0は参考値で、読み込み時に鍵は変えません。",
          "source": "console.log(\"double quote:\", \"\\\"\");\nconsole.log(\"single quote:\", \"'\");\nconsole.log(\"backslash:\"," +
          " \"\\\\\");\nconsole.log(\"line break:\", \"first\\nsecond\");",
          "expected": {
            "consoleCalls": [
              {
                "method": "log",
                "args": [
                  "double quote:",
                  "\""
                ]
              },
              {
                "method": "log",
                "args": [
                  "single quote:",
                  "'"
                ]
              },
              {
                "method": "log",
                "args": [
                  "backslash:",
                  "\\"
                ]
              },
              {
                "method": "log",
                "args": [
                  "line break:",
                  "first\nsecond"
                ]
              }
            ],
            "domAppend": [],
            "observation": "ソースには4行を区切る3個の実LFがあり、文字列内の改行は構文上の\\nです。シフト0でも生成時の文字列エスケープが必要です。"
          }
        },
        "en": {
          "name": "Quotes and backslashes",
          "description": "Distinguish quotes, backslashes, source line breaks, and a string's newline escape. Suggested shift 0 is infor" +
          "mational; loading preserves the current shift.",
          "source": "console.log(\"double quote:\", \"\\\"\");\nconsole.log(\"single quote:\", \"'\");\nconsole.log(\"backslash:\"," +
          " \"\\\\\");\nconsole.log(\"line break:\", \"first\\nsecond\");",
          "expected": {
            "consoleCalls": [
              {
                "method": "log",
                "args": [
                  "double quote:",
                  "\""
                ]
              },
              {
                "method": "log",
                "args": [
                  "single quote:",
                  "'"
                ]
              },
              {
                "method": "log",
                "args": [
                  "backslash:",
                  "\\"
                ]
              },
              {
                "method": "log",
                "args": [
                  "line break:",
                  "first\nsecond"
                ]
              }
            ],
            "domAppend": [],
            "observation": "The four source lines contain three real LF separators; the string newline is written as a valid \\n escape. S" +
            "hift 0 still needs safe string escaping."
          }
        },
        "sourceLineBreaks": {
          "lfCount": 3,
          "crCount": 0
        }
      },
      {
        "id": "console",
        "recommendedShift": 3,
        "ja": {
          "name": "コンソールの5メソッド",
          "description": "log・info・warn・error・debugの同期出力を観察します。例外は投げません。推奨シフト3は参考値で、読み込み時に鍵は変えません。",
          "source": "console.log(\"log\", \"example\");\nconsole.info(\"info\", 42);\nconsole.warn(\"warn\", \"sample warning\");\n" +
          "console.error(\"error\", \"sample error\");\nconsole.debug(\"debug\", true);",
          "expected": {
            "consoleCalls": [
              {
                "method": "log",
                "args": [
                  "log",
                  "example"
                ]
              },
              {
                "method": "info",
                "args": [
                  "info",
                  42
                ]
              },
              {
                "method": "warn",
                "args": [
                  "warn",
                  "sample warning"
                ]
              },
              {
                "method": "error",
                "args": [
                  "error",
                  "sample error"
                ]
              },
              {
                "method": "debug",
                "args": [
                  "debug",
                  true
                ]
              }
            ],
            "domAppend": [],
            "observation": "既存runnerは5メソッドを同じログ経路で返します。メソッド名は各呼び出しの第一引数で示します。console.errorもサンプルログで、例外ではありません。"
          }
        },
        "en": {
          "name": "Five console methods",
          "description": "Observe synchronous log, info, warn, error, and debug output without throwing. Suggested shift 3 is informatio" +
          "nal; loading preserves the current shift.",
          "source": "console.log(\"log\", \"example\");\nconsole.info(\"info\", 42);\nconsole.warn(\"warn\", \"sample warning\");\n" +
          "console.error(\"error\", \"sample error\");\nconsole.debug(\"debug\", true);",
          "expected": {
            "consoleCalls": [
              {
                "method": "log",
                "args": [
                  "log",
                  "example"
                ]
              },
              {
                "method": "info",
                "args": [
                  "info",
                  42
                ]
              },
              {
                "method": "warn",
                "args": [
                  "warn",
                  "sample warning"
                ]
              },
              {
                "method": "error",
                "args": [
                  "error",
                  "sample error"
                ]
              },
              {
                "method": "debug",
                "args": [
                  "debug",
                  true
                ]
              }
            ],
            "domAppend": [],
            "observation": "The existing runner sends all five methods through one log channel. Each call labels itself with its first arg" +
            "ument. console.error is a sample log, not an exception."
          }
        },
        "runnerLogs": [
          "log example",
          "info 42",
          "warn sample warning",
          "error sample error",
          "debug true"
        ]
      },
      {
        "id": "scope",
        "recommendedShift": 3,
        "ja": {
          "name": "IIFEのローカル変数",
          "description": "IIFE内のvarとglobalThisへの公開有無を観察します。推奨シフト3は参考値で、読み込み時に鍵は変えません。",
          "source": "(function () {\n  var phase2Local = 42;\n  console.log(\"local\", phase2Local);\n})();\nconsole.log(\"global\"" +
          ", Object.hasOwn(globalThis, \"phase2Local\"));",
          "expected": {
            "consoleCalls": [
              {
                "method": "log",
                "args": [
                  "local",
                  42
                ]
              },
              {
                "method": "log",
                "args": [
                  "global",
                  false
                ]
              }
            ],
            "domAppend": [],
            "observation": "新しい既存sandboxで明示的に実行するとlocal 42、global falseを出力します。IIFE内のvarはglobalThisの自身のプロパティになりません。"
          }
        },
        "en": {
          "name": "IIFE local scope",
          "description": "Observe an IIFE-local var and whether it becomes a globalThis property. Suggested shift 3 is informational; lo" +
          "ading preserves the current shift.",
          "source": "(function () {\n  var phase2Local = 42;\n  console.log(\"local\", phase2Local);\n})();\nconsole.log(\"global\"" +
          ", Object.hasOwn(globalThis, \"phase2Local\"));",
          "expected": {
            "consoleCalls": [
              {
                "method": "log",
                "args": [
                  "local",
                  42
                ]
              },
              {
                "method": "log",
                "args": [
                  "global",
                  false
                ]
              }
            ],
            "domAppend": [],
            "observation": "Explicit execution in the existing fresh sandbox logs local 42 and global false. The IIFE-local var does not b" +
            "ecome an own property of globalThis."
          }
        },
        "runnerLogs": [
          "local 42",
          "global false"
        ]
      }
    ]
  };

  function freeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      for (const child of Object.values(value)) freeze(child);
      Object.freeze(value);
    }
    return value;
  }

  function get(id, language) {
    if (typeof id !== "string" || (language !== "ja" && language !== "en")) return null;
    const sample = data.samples.find((entry) => entry.id === id);
    if (!sample) return null;
    return Object.freeze({ id: sample.id, recommendedShift: sample.recommendedShift, ...sample[language] });
  }

  return freeze({ ...data, get });
});
