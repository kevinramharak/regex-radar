# Regex Radar – Architecture Overview

This directory contains documentation for the internal architecture of the Regex Radar extension and language server. The goal is to give contributors a clear understanding of how the system works, howresponsibilities are divided, and how data flows through the system.

Regex Radar is built on top of the Language Server Protocol (LSP), with a strict separation between:

- The **client extension** (VS Code)
- The **language client** (LSP Client)
- The **language server** (LSP Server)
- The **shared protocol** (custom requests, configuration, capabilities - build on top of LSP)
- The **Regex Radar features** (linter, ReDoS check, analysis, diagnostics)

## Diagram

| Package     | Question it answers                                                            |
| ----------- | ------------------------------------------------------------------------------ |
| parser      | _What is the syntactic structure?_                                             |
| discovery   | _Where are the regexes?_                                                       |
| analysis    | _What do these regexes mean?_                                                  |
| diagnostics | _How do we report the meaning to the editor?_                                  |
| server      | _When do we run which processes, and how do we deliver results to the client?_ |
| client      | _How do we communicate with the server_                                        |

## Components

### [`diagnostics.md`](./diagnostics.md)

Regex Radar produces diagnostics through a hybrid of:

- Document pulls
- Workspace pulls
- Server-initiated pushes (only when workspace diagnostics are disabled)

The system supports streaming workspace diagnostics and async results (e.g., ReDoS detection).

Internally, diagnostics are managed as if a single multi-root workspace is active. This central manager decides how diagnostics are forwarded to the client, simplifying coordination between components.

### [`extension.md`](./extension.md)

The extension is intentionally thin:

- Creates UI components (tree views, commands, side panels)
- Routes LSP data into VS Code APIs
- Provides commands:
    - open in external tool
    - navigate to regex in tree view
    - future: visualization, benchmarking, workspace audits
- Delegates all computation to the language server
- Uses the Regex Radar extension of `vscode-languageserver-client`, so LSP integration is automatic

No business logic lives here.

### [`parsers.md`](./parsers.md)

Responsible for turning source text into structured information.

- Provides incremental ASTs for documents.
- Caches ASTs with correct invalidation on edits.
- Exposes Tree-sitter queries for:
    - Regex detection
    - Suppression/enable directives
    - Any additional syntactic patterns needed by analysis
- Language support is added by:
    - Adding a grammar
    - Adjusting the queries to reflect the language’s AST shape

Parsers produce pure syntactic data and are intentionally side-effect free.

### [`analysis.md`](./analysis.md)

Consumes the results from the parser layer and produces analysis outputs such as:

- Lint rule results
- ReDoS detection
- Maintainability metrics
- Other semantic checks

Characteristics:

- Stateless, pure functions where possible
- No direct AST traversal (only query outputs)
- Configurable via rule sets or directive metadata

Analysis focuses only on regex semantics, not editor state or LSP protocol.

### [`configuration.md`](./configuration.md)

TODO: how is this supposed to work?

### [`lsp-client`]

A minimal extension of [`vscode-languageserver-client`](https://github.com/microsoft/vscode-languageserver-node/tree/main/client).

- Establishes connection
- Sends configuration
- Provides helper methods for client-initiated requests
- Does not contain logic

Acts as a boundary between the extension and the server.

### [`language-server.md`](./language-server.md)

The language server is built using:

- [`vscode-languageserver`](https://github.com/microsoft/vscode-languageserver-node)
- [`@gitlab/needle`](https://www.npmjs.com/package/@gitlab/needle) for lightweight dependency injection

The server coordinates everything:

- Handles LSP requests and capabilities
- Manages document state (open + virtual closed docs)
- Provides FS access, workspace state, and cache management
- Invokes discovery and analysis
- Produces diagnostics (pull, workspace, or push)
- Manages lifecycle and message routing
- Uses DI to wire components and event handlers

This layer is intentionally a bit monolithic because it has to connect all domains and the LSP runtime.

Should be structured as:

- Infrastrure
    - connection
    - message/event routing
    - logging
    - DI container
    - file system abstraction
- Document model
    - document state
    - virtual documents for closed files
    - workspace scan state
    - cache invalidation
    - source of truth
- Programmatic Language Features
    - diagnostics
    - code lenses
    - code actions
