# Regex Radar

A Language Server-powered toolkit for developing, testing, and maintaining regular expressions inside VS Code and beyond.
It provides instant visibility across your regex patterns, enables safe testing, and is built with an extensible architecture that can support other editors and CLI workflows.

> [!NOTE]
> **Versioning & stability**
>
> Regex Radar is currently in the `0.x.x` phase. Breaking changes and unstable behavior are still expected.
>
> - **0.even.x** → regular releases (recommended for most users)
> - **0.odd.x** → pre-releases and experimental features
>
> The first stable release will begin at `1.x.x`.

## Features

### Discovery

Dynamic discovery of regular expressions across your workspace, presented in a clear and structured view.

Regex Radar indexes both literal `/.../flags` patterns and `RegExp(...)` constructors/function calls. View them in a structured tree panel to understand how patterns are used across your codebase.

![Shows all regex literals and `new RegExp` calls grouped by file so you can locate patterns quickly.](./assets/explorer-tree-view.png)

### Detects ReDoS vulnerabilities

Detect unsafe & vulnerable regular expressions, including patterns susceptible to ReDoS.

Powered by the [recheck](https://makenowjust-labs.github.io/recheck/) ReDoS checker, Regex Radar identifies patterns that may lead to catastrophic backtracking or performance issues. Suspicious patterns surface through diagnostics for early review.

![Flags regex patterns that may exhibit catastrophic backtracking or unbounded performance issues.](./assets//diagnostic-redos.png)

### Focus on Performance and Dev UX

Regex Radar performs analysis incrementally without blocking the UI, keeping editor performance smooth even in large projects.

### External Tool integration

Quick commands let you open any pattern directly in [RegExr](https://regexr.com/) or [Regex101](https://regex101.com/) for testing, visualization or debugging workflows.

![Send any regex directly to RegExr or Regex101 to experiment, debug or share.](./assets/open-in-external-tools.png)

### Built-in linter

Integrated linting and analysis to detect confusing, overly complex or unnecessarily repetitive patterns.

Highlight patterns that are unclear, overly complex, ambiguous or difficult to maintain. Surface insights that improve long-term readability.

![Detects patterns that are overly complex, redundant, or hard to understand at a glance.](./assets//diagnostic-linter.png)

### Configurable

Fully configurable behavior and analysis rules, allowing you to enable only the parts you value.

Enable or disable analysis behaviors to fine-tune the extension to your development style and environment.

![Enable or disable specific checks, views or workflows to fit your project's needs.](./assets/configuration-settings.png)

## Installation

Available on:

- the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=regex-radar.regex-radar).
- in your [VS Code editor](vscode:extension/regex-radar.regex-radar).
- As `.vsix` file on the [GitHub Releases](github.com/kevinramharak/regex-radar/releases) page.

## Getting Started

1. Install the extension
2. Linter and ReDoS checking will run in the background, diagnostics will be shown in the VS Code interface.
3. Open the Regex Explorer pane in the Explorer panel or use the Regex Explorer panel. (screenshots to follow).
4. Click on a regular expression to find it in your source code.
5. Use the context menu (right click) to open the regex in an external tool.

## How it works

Regex Radar is composed of multiple parts:

- **Client Extension (VS Code):** The UI that is integrated in the VS Code editor and will enable communication with the language server
- **Language Server:** implements the Language Service Protocol to enable clients to invoke the various features of Regex Radar
- **Features**: the different features that Regex Radar provides to develop, test and maintain regular expressions.

The Language Server architecture allows the same backend logic to be shared with other IDEs or tooling environments.

Additionally the source code parsing is done with [`tree-sitter`](https://tree-sitter.github.io/tree-sitter/), to help aim for a language agnostic toolset that can work with any language that has a tree sitter grammar available.

## FAQ

### Is this more AI slop?

**No**, this is not one of those AI-generated extensions.

All code, architecture, and design decisions are written and maintained by a human. AI was only used where it's actually effective: brainstorming ideas, organizing milestones, and proofreading documentation. The implementation itself is fully human.

I am a software (over)engineer, not a project manager or marketeer, so assistance in those areas is very welcome, and IMO good fit for AI.

### What does "Language Server-powered" mean and why does it matter?

Regex Radar runs heavy tasks in a separate process, the **language server**, so VS Code stays
responsive and fast. The language server handles analysis independently of the editor.

It also allows other IDEs or tools to use the same engine via the
[Language Server Protocol](https://microsoft.github.io/language-server-protocol/).

### How is this different from other Regular Expression extensions?

Most regex extensions only scan individual files or rely on slow, error-prone scanning. Regex Radar takes a different approach:

- Workspace-wide discovery. Automatically finds every regex in your project and organizes them in a clear, navigable tree.
- Fast and non-blocking. Scans large codebases without freezing the editor. The heavy lifting runs outside the VS Code UI, so performance stays smooth.
- Accurate extraction. Uses language-aware analysis instead of brittle pattern matching, reducing false positives and missed regexes.
- Designed to grow. Built on a pluggable architecture so new analysis tools can be added, and tools can share results instead of duplicating work.

### Does this only support JavaScript/TypeScript?

Yes, currently only JavaScript and TypeScript are supported.
The core engine is language-agnostic, so adding other languages is relatively easy and planned for future releases.

### Can I disable the linter?

Yes. All rules can be toggled individually, or the linter can be turned off entirely.
Regex Radar is designed to **complement**, not replace, other tools like ESLint.
If you already use ESLint with rules that check regexes, disable overlapping rules to avoid duplication.

## Roadmap

### 1. Reach the MVP baseline

- [x] Complete the initial [MVP Release](https://github.com/kevinramharak/regex-radar/issues/6)

### Planned features

#### Visualization & Understanding

- [ ] Inline hover / Regex explorer panel explanations with structural breakdowns
- [ ] Visual breakdown of vulnerable patterns (heatmaps, worst-case match traces)
- [ ] Complexity scoring to help with maintainibility estimates

#### Testing

- [ ] Example string testing inside a preview editor with match and capture group highlighting
- [ ] Optional benchmarking mode to measure pattern execution cost

#### Fixes, Refactoring and Suggestions

- [ ] Suggestions to simplify, rewrite or refactor patterns
- [ ] Code actions to fix common readability and performance issues

#### External Tool Integration

- [ ] Expand the integration with external tools

#### Reporting

- [ ] Workspace-wide regex audit summaries and reports

#### Additional Languages, Editors & Tools

- [ ] Additional language support for commonly uses and requested languages
- [ ] Reuse the Language Server in other editors (Neovim, JetBrains, etc.)
- [ ] CLI tool for CI pipelines, audits and code review automation
- [ ] Implement a [Custom Notebook Controller](https://code.visualstudio.com/api/extension-guides/notebook) to create a seamless workflow of working with regular expressions inside VS Code

## Contributing

See [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md) (WIP) for instructions on how to setup the project and start contributing.

## License

Licenced under [MIT](./LICENSE).
