# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Classic JS Obfuscator is a web-based tool that generates self-decrypting JavaScript snippets using classical cryptography (Caesar cipher). The tool creates obfuscated JavaScript code that can decrypt and execute itself using an embedded decryption function.

## Architecture

This is a simple static web application with no build system or dependencies:

- **index.html**: Main HTML structure with tab-based UI (Caesar cipher tab implemented, Vigenère cipher tab placeholder)
- **script.js**: Core functionality including:
  - Caesar cipher encryption/decryption functions (ASCII 32-126 range)
  - IIFE snippet generation with embedded runtime decryption
  - UI event handlers for generate, copy, download, and test execution
- **style.css**: Styling for the interface

## Key Implementation Details

The obfuscation process:
1. Original JavaScript code is encrypted using Caesar cipher (shift within ASCII visible range 32-126)
2. A minimal runtime decryption function is embedded in the output
3. The final output is an IIFE that decrypts and executes the payload using `eval`

- Shift range: 0-94 (95 printable ASCII characters)
- Non-ASCII characters (e.g., Japanese text, emojis) pass through unchanged

## Development

- No build process or package manager - pure vanilla JavaScript
- To test locally, open `index.html` directly in a browser
- Uses GitHub Pages for deployment at https://ipusiron.github.io/classic-js-obfuscator/
- The tool is part of the "100 Security Tools with AI" project (Day 042)
- Vigenère cipher tab is intentionally unimplemented (placeholder for future enhancement)

## Security Considerations

This is an educational tool demonstrating classical cryptography for code obfuscation. The generated code uses `eval` for self-execution, which has security implications. The obfuscation provides only readability reduction, not true security - the original code can be recovered through static analysis.