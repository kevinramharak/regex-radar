# RegexRadar

## ⚙️ Core Concept

A Regex Intelligence Tooling extension — a VS Code + Language Server combo that:
- Detects regex literals and constructor calls in your code.
- Indexes and lists them in a sidebar.
- Lets you analyze, test, or export them to external tools (like regexr.com).
- Optionally checks for performance issues (ReDoS).

## 🔸 Core Features (MVP)

1. Regex Detection
  - Detect regex literals (/pattern/flags) and new RegExp("pattern", "flags") calls.
  - Use AST parsing (e.g., via @babel/parser for JS/TS, tree-sitter for multi-language).
  - The language server returns a list of regex locations + metadata (pattern, flags, file, line, etc.).
2. Regex Explorer View
  - VS Code TreeView panel titled “Regex Explorer.”
  - Lists regexes grouped by file.
  - Click → navigates to definition in the editor.
3. Open in Regexr
  - Right-click command: “Open in Regexr” → opens browser tab pre-filled with that pattern.
  - Just URL encode and append to https://regexr.com/?expression=....
4. ReDoS Detection
  - Use an existing library like recheck or safe-regex
  - Flag dangerous regexes in the Problems panel.
  - Add hover diagnostics: “⚠️ This regex may be vulnerable to catastrophic backtracking (ReDoS).”

## 🔹 Nice-to-Have Features (Next Phase)

5. Inline Visualization
  - Hover over regex → show a breakdown:
```
  (a|b)+\d{2}
- (a|b)+ : one or more of a or b
- \d{2}  : two digits
```
  - Use a library like regexp-tree or regexpp to parse regex ASTs.
6. Example Matcher
  - Inline “test string” input in a webview.
  - Displays match groups with color-coded highlighting.
7. Regex Linter / Complexity Analyzer
  - Compute estimated match complexity (quantifiers, nested groups).
  - Suggest simplifications: e.g., (a|b|c) → [abc].
8. Language Support Extension Points
  - Start with JS/TS, then make the regex finder language-agnostic using Tree-sitter parsers (Python, Java, etc.).
  - Could even detect multi-line regex construction in code like:
```js
const pattern = [
  '^\\d{4}',
  '[A-Z]{2}',
  '$'
].join('');
```

## 🔸 Advanced / Experimental

9. Test Suite Generator
  - For each regex, auto-generate sample matches and non-matches.
  - Optionally output them as unit tests (e.g., Jest test.each).
10. ReDoS Benchmark Mode
  - Run suspect regexes on synthetic long strings and measure execution time to confirm issues.
  - Show timing results in a side panel.
11. AI/Heuristic Pattern Rewriter
  - Suggest safer alternatives using a pattern rewrite model.
  - Example: Suggest using [^]*? instead of .* in multiline contexts.

## 🧩 Architecture Sketch
### Components
| Component | Role |
| --- | --- |
| **Client (VS Code Extension)** | Registers the Regex Explorer TreeView, commands (“Open in Regexr”, etc.), and sends file text to the server. |
| **Language Server**            | Parses code files, extracts regexes, runs safety analysis (ReDoS), returns diagnostics + data.               |
| **Regex Analyzer Module**      | Encapsulates parsing + analysis logic; can be language-agnostic.                                             |


### Message Flow (simplified)
```
VSCode Client
    ↕ initialize, openDocument, etc.
Language Server
    → parse AST for regex literals
    → send diagnostics (for unsafe regexes)
    → provide data for Regex Explorer TreeView
Client UI (TreeView, Hover, Commands)

## 🔧 Stack Recommendations
| Purpose         | Suggested Tools                           |
| --------------- | ----------------------------------------- |
| Parsing (JS/TS) | `@babel/parser` or `acorn`                |
| Regex analysis  | `regexp-tree`, `safe-regex`, or `recheck` |
| LSP framework   | `vscode-languageserver`                   |
| Client API      | `vscode` npm package                      |
| Testing         | `vscode-test`, `jest`                     |
| Packaging       | `vsce`                                    |
