![Logo](./assets/logo-wide.png)

# Regex Radar

## tasks

- [ ] file watchers
- [ ] different bundle for web
- [ ] detect implicit regexes
- [ ] comment directive support
- [ ] visualization (hover + webview?)
- [ ] example matching (seperate file, temp file, clipboard)
- [ ] complexity
- [ ] code actions (simplify, convert literal/constructor)
- [ ] diagnostics (warnings, hints, tips)
    - [ ] redos (https://github.com/makenowjust-labs/recheck)
    - [ ] benchmark ?
- [ ] more languages (based on tree-sitter grammars)
- [ ] Test utilities
- [ ] DSL's like https://github.com/francisrstokes/super-expressive
- [ ] template tagged function like https://www.npmjs.com/package/regex

## inspiration

- https://marketplace.visualstudio.com/items?itemName=baumundzwanzig.vscode-regex-tester
- https://marketplace.visualstudio.com/items?itemName=pedrohenrique-ql.regex-match
- https://marketplace.visualstudio.com/items?itemName=Kundros.regexer-extension
- https://marketplace.visualstudio.com/items?itemName=StevenCyb.vsregex
- https://marketplace.visualstudio.com/items?itemName=nodeGarden.randexp
- https://github.com/babobski/JS-Regex-Tester
- todo tree extension, has good tree implementation

## ⚙️ Core Concept

A Regex Intelligence Tooling extension — a VS Code + Language Server combo that:

- Detects regex literals and constructor calls in your code.
- Indexes and lists them in a sidebar.
- Lets you analyze, test, or export them to external tools (like regexr.com).
- Optionally checks for performance issues (ReDoS).

## 🔸 Core Features (MVP)

1. Regex Detection

- Detect regex literals (/pattern/flags) and new RegExp("pattern", "flags") calls.
- Detect regex implicit conversions like [`String.prototype.match`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match)
- Use AST parsing (e.g., via @babel/parser for JS/TS, tree-sitter for multi-language).
- The language server returns a list of regex locations + metadata (pattern, flags, file, line, etc.).

2. Regex Explorer View -> Currently a tree-view inside the explorer

- VS Code TreeView panel titled “Regex Explorer.”
- Lists regexes grouped by file.
- Click → navigates to definition in the editor.

3. Open in Regexr, Regex101 & (maybe) https://regex-generator.olafneumann.org

- Right-click command: “Open in Regexr” → opens browser tab pre-filled with that pattern.
- Just URL encode and append to https://regexr.com/?expression=....

```js
// RegExr source
let params = Utils.getUrlParams();
if (Utils.isLocal && params.id) {
    Server.load(params.id).then((o) => (this.state = o));
    params = {};
}
if (params.engine) {
    this.flavor.value = params.engine;
}
if (params.expression) {
    this.expression.value = params.expression;
}
if (params.text) {
    this.text.value = params.text;
}
if (params.tool) {
    this.tools.value = { id: params.tool, input: params.input };
}
```

- see https://github.com/firasdib/Regex101/wiki/FAQ#how-to-prefill-the-fields-on-the-interface-via-url
- https://regex101.com/?regex=<regex>&testString=<text>&flags=<flags>&subst=<replacement>&delimiter=<delimiter>

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
const pattern = ['^\\d{4}', '[A-Z]{2}', '$'].join('');
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
- Example: Suggest using [^]_? instead of ._ in multiline contexts.

## 🧩 Architecture Sketch

### Components

| Component                      | Role                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
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
```

## Notes:

- https://code.visualstudio.com/docs/getstarted/userinterface#_advanced-tree-navigation for filtering / search
