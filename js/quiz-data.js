/* Fixed bilingual learning questions; no code execution. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.QuizData = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const questions = [
    {
      "id": "basic-shift",
      "sampleId": "basic",
      "prompt": {
        "ja": "Aを鍵3でシフトすると？",
        "en": "What does A become with shift 3?"
      },
      "choices": [
        {
          "id": "a",
          "text": {
            "ja": "C",
            "en": "C"
          }
        },
        {
          "id": "b",
          "text": {
            "ja": "D",
            "en": "D"
          }
        },
        {
          "id": "c",
          "text": {
            "ja": "E",
            "en": "E"
          }
        }
      ],
      "answerId": "b",
      "explanation": {
        "ja": "ASCIIのAを3だけ進めるとDです。",
        "en": "Shifting ASCII A forward by 3 produces D."
      },
      "evidence": {
        "type": "shift",
        "input": "A",
        "shift": 3,
        "expected": "D"
      }
    },
    {
      "id": "basic-range",
      "sampleId": "basic",
      "prompt": {
        "ja": "シフト対象のASCII範囲に含まれる文字数は？",
        "en": "How many characters are in the shifted ASCII range?"
      },
      "choices": [
        {
          "id": "a",
          "text": {
            "ja": "94",
            "en": "94"
          }
        },
        {
          "id": "b",
          "text": {
            "ja": "95",
            "en": "95"
          }
        },
        {
          "id": "c",
          "text": {
            "ja": "96",
            "en": "96"
          }
        }
      ],
      "answerId": "b",
      "explanation": {
        "ja": "32から126までを両端含めて数えます。",
        "en": "Count code points 32 through 126, including both ends."
      },
      "evidence": {
        "type": "range",
        "expected": 95
      }
    },
    {
      "id": "wrap-space",
      "sampleId": "ascii-wrap",
      "prompt": {
        "ja": "空白を鍵94でシフトすると？",
        "en": "What does a space become with shift 94?"
      },
      "choices": [
        {
          "id": "a",
          "text": {
            "ja": "~",
            "en": "~"
          }
        },
        {
          "id": "b",
          "text": {
            "ja": "}",
            "en": "}"
          }
        },
        {
          "id": "c",
          "text": {
            "ja": "空白",
            "en": "Space"
          }
        }
      ],
      "answerId": "a",
      "explanation": {
        "ja": "対象範囲内で空白はチルダに移ります。",
        "en": "Within the supported range, a space moves to a tilde."
      },
      "evidence": {
        "type": "shift",
        "input": " ",
        "shift": 94,
        "expected": "~"
      }
    },
    {
      "id": "wrap-tilde",
      "sampleId": "ascii-wrap",
      "prompt": {
        "ja": "チルダを鍵1でシフトすると？",
        "en": "What does a tilde become with shift 1?"
      },
      "choices": [
        {
          "id": "a",
          "text": {
            "ja": "!",
            "en": "!"
          }
        },
        {
          "id": "b",
          "text": {
            "ja": "DEL",
            "en": "DEL"
          }
        },
        {
          "id": "c",
          "text": {
            "ja": "空白",
            "en": "Space"
          }
        }
      ],
      "answerId": "c",
      "explanation": {
        "ja": "範囲の末尾から先頭の空白へ折り返します。",
        "en": "The end of the range wraps to the initial space."
      },
      "evidence": {
        "type": "shift",
        "input": "~",
        "shift": 1,
        "expected": " "
      }
    },
    {
      "id": "unicode-emoji",
      "sampleId": "unicode",
      "prompt": {
        "ja": "😀のコードポイント数とUTF-16単位数は？",
        "en": "What are the code-point and UTF-16-unit counts of 😀?"
      },
      "choices": [
        {
          "id": "a",
          "text": {
            "ja": "1 / 1",
            "en": "1 / 1"
          }
        },
        {
          "id": "b",
          "text": {
            "ja": "1 / 2",
            "en": "1 / 2"
          }
        },
        {
          "id": "c",
          "text": {
            "ja": "2 / 2",
            "en": "2 / 2"
          }
        }
      ],
      "answerId": "b",
      "explanation": {
        "ja": "この絵文字は1コードポイントで、UTF-16では2単位です。",
        "en": "This emoji is one code point and two UTF-16 code units."
      },
      "evidence": {
        "type": "size",
        "input": "😀",
        "expected": [
          1,
          2,
          4
        ]
      }
    },
    {
      "id": "unicode-combining",
      "sampleId": "unicode",
      "prompt": {
        "ja": "eとU+0301を鍵3でシフトすると、どちらが変わる？",
        "en": "When e followed by U+0301 is shifted by 3, which part changes?"
      },
      "choices": [
        {
          "id": "a",
          "text": {
            "ja": "両方",
            "en": "Both"
          }
        },
        {
          "id": "b",
          "text": {
            "ja": "結合アクセントだけ",
            "en": "Only the combining accent"
          }
        },
        {
          "id": "c",
          "text": {
            "ja": "eだけ",
            "en": "Only e"
          }
        }
      ],
      "answerId": "c",
      "explanation": {
        "ja": "ASCIIのeだけがhへ移り、U+0301はそのままです。",
        "en": "Only ASCII e becomes h; U+0301 passes through unchanged."
      },
      "evidence": {
        "type": "shift",
        "input": "é",
        "shift": 3,
        "expected": "h́"
      }
    },
    {
      "id": "escapes-zero",
      "sampleId": "escapes",
      "prompt": {
        "ja": "鍵0なら文字列のエスケープは不要？",
        "en": "Does shift 0 remove the need for string escaping?"
      },
      "choices": [
        {
          "id": "a",
          "text": {
            "ja": "不要",
            "en": "Yes"
          }
        },
        {
          "id": "b",
          "text": {
            "ja": "必要",
            "en": "No"
          }
        },
        {
          "id": "c",
          "text": {
            "ja": "英語なら不要",
            "en": "Not needed for English"
          }
        }
      ],
      "answerId": "b",
      "explanation": {
        "ja": "シフトがなくても引用符を文字列へ埋め込む処理は必要です。",
        "en": "Even without shifting, quotes must be escaped in a string literal."
      },
      "evidence": {
        "type": "escape",
        "input": "\"",
        "expected": "\\\""
      }
    },
    {
      "id": "escapes-lf",
      "sampleId": "escapes",
      "prompt": {
        "ja": "教材ソースの行を区切る実LFは何個？",
        "en": "How many actual LF separators are in the escape sample source?"
      },
      "choices": [
        {
          "id": "a",
          "text": {
            "ja": "3",
            "en": "3"
          }
        },
        {
          "id": "b",
          "text": {
            "ja": "4",
            "en": "4"
          }
        },
        {
          "id": "c",
          "text": {
            "ja": "5",
            "en": "5"
          }
        }
      ],
      "answerId": "a",
      "explanation": {
        "ja": "4行の区切りは3個です。文字列内の改行エスケープとは別です。",
        "en": "Four source lines have three separators, distinct from the string's newline escape."
      },
      "evidence": {
        "type": "sampleLf",
        "expected": 3
      }
    },
    {
      "id": "console-methods",
      "sampleId": "console",
      "prompt": {
        "ja": "この教材が使う同期consoleメソッドは何種類？",
        "en": "How many synchronous console methods does this sample use?"
      },
      "choices": [
        {
          "id": "a",
          "text": {
            "ja": "3",
            "en": "3"
          }
        },
        {
          "id": "b",
          "text": {
            "ja": "4",
            "en": "4"
          }
        },
        {
          "id": "c",
          "text": {
            "ja": "5",
            "en": "5"
          }
        }
      ],
      "answerId": "c",
      "explanation": {
        "ja": "log、info、warn、error、debugの5種類です。",
        "en": "It uses log, info, warn, error, and debug."
      },
      "evidence": {
        "type": "sampleCalls",
        "expected": 5
      }
    },
    {
      "id": "console-error",
      "sampleId": "console",
      "prompt": {
        "ja": "教材のconsole.errorは例外を投げる？",
        "en": "Does the sample's console.error call throw an exception?"
      },
      "choices": [
        {
          "id": "a",
          "text": {
            "ja": "必ず投げる",
            "en": "Always"
          }
        },
        {
          "id": "b",
          "text": {
            "ja": "投げない",
            "en": "No"
          }
        },
        {
          "id": "c",
          "text": {
            "ja": "鍵による",
            "en": "Depends on the shift"
          }
        }
      ],
      "answerId": "b",
      "explanation": {
        "ja": "この教材ではログを出力するだけです。throwとは区別します。",
        "en": "In this sample it only logs a message; it is distinct from throw."
      },
      "evidence": {
        "type": "sampleError",
        "expected": false
      }
    },
    {
      "id": "scope-own",
      "sampleId": "scope",
      "prompt": {
        "ja": "新しいsandboxで教材を実行すると、phase2LocalはglobalThisの自身のプロパティになる？",
        "en": "In a fresh sandbox, does the sample make phase2Local an own property of globalThis?"
      },
      "choices": [
        {
          "id": "a",
          "text": {
            "ja": "なる",
            "en": "Yes"
          }
        },
        {
          "id": "b",
          "text": {
            "ja": "鍵0だけなる",
            "en": "Only with shift 0"
          }
        },
        {
          "id": "c",
          "text": {
            "ja": "ならない",
            "en": "No"
          }
        }
      ],
      "answerId": "c",
      "explanation": {
        "ja": "varはこの教材のIIFE内にあり、外側のglobalThisには公開されません。",
        "en": "The var is inside this sample's IIFE, not exposed on globalThis."
      },
      "evidence": {
        "type": "sampleScope",
        "expected": false
      }
    },
    {
      "id": "scope-safety",
      "sampleId": "scope",
      "prompt": {
        "ja": "固定形式の復元に成功したら、実行しても安全？",
        "en": "Does successful fixed-format restoration prove that execution is safe?"
      },
      "choices": [
        {
          "id": "a",
          "text": {
            "ja": "保証しない",
            "en": "No guarantee"
          }
        },
        {
          "id": "b",
          "text": {
            "ja": "常に安全",
            "en": "Always safe"
          }
        },
        {
          "id": "c",
          "text": {
            "ja": "鍵3なら安全",
            "en": "Safe with shift 3"
          }
        }
      ],
      "answerId": "a",
      "explanation": {
        "ja": "形式一致、文字列一致、コードの安全性は別の判定です。",
        "en": "Format acceptance, string equality, and code safety are distinct judgments."
      },
      "evidence": {
        "type": "contract",
        "expected": "noSafetyGuarantee"
      }
    }
  ];

  function freeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }

  return freeze(questions);
});
