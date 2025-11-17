# Regex Radar – Diagnostics Architecture

This document describes how diagnostics flow between the VS Code client and the Regex Radar
language server. Regex Radar uses four communication channels:

- **Document Pull** (`textDocument/diagnostic`)
- **Workspace Pull** (`workspace/diagnostic`)
- **Push Diagnostics** (`textDocument/publishDiagnostics`)
- **Refresh Notifications** (`workspace/diagnostic/refresh`)

Regex Radar supports two diagnostic modes:

- **Editor Diagnostics** — diagnostics for open documents
- **Workspace Diagnostics** — diagnostics for the entire project

Workspace diagnostics can be toggled with the following setting:

```
regex-radar.diagnostics.workspace.enabled
```

This setting controls **how** diagnostics are delivered, not **what** is analyzed.

---

## 1. Overview

Regex Radar performs analysis on:

- Regex literals in open documents
- Regexes discovered across the entire workspace
- Long-running checks (such as ReDoS detection)

What changes is the reporting channel.

### When workspace diagnostics are OFF:

- Open documents → document pull
- Async results for open documents → push
- Closed documents → no diagnostics

### When workspace diagnostics are ON:

- All documents (open + closed) → workspace pull
- Async results → workspace pull
- Push diagnostics are not used

### Conflicts

Document pull diagnostics always override workspace diagnostics for the same document, per [LSP spec](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#workspace_diagnostic).

---

## 2. Diagnostic Channels

### 2.1 Document Pull (`textDocument/diagnostic`)

- Triggered automatically by the client for open or relevant editors.
- Used for fast, synchronous diagnostics such as linting.
- Results apply only to the open document.
- Always enabled.
- Document pull diagnostics override workspace diagnostics.

---

### 2.2 Workspace Pull (`workspace/diagnostic`)

Enabled when:

```
regex-radar.diagnostics.workspace.enabled = true
```

Behavior:

- The client initiates a long-running request.
- The server streams diagnostics for:
    - Closed files
    - Open files
    - Incremental updates
    - Async analysis (e.g., ReDoS)
- Replaces the need for push diagnostics entirely.
- The client restarts the request when the server closes it.

---

### 2.3 Push Diagnostics (`textDocument/publishDiagnostics`)

Used only when workspace diagnostics are **disabled**. Used to deliver the results of (long-running) async analysis.

Push diagnostics deliver:

- Async results for open files (e.g., ReDoS finishing later)
- Results that cannot be returned immediately from a document pull

When workspace diagnostics are enabled, push diagnostics are never used.

---

### 2.4 Refresh (`workspace/diagnostic/refresh`)

Used when the server needs the client to re-pull diagnostics due to internal state changes the client
cannot detect automatically.

Examples:

- Files added or removed
- Regex discovery state changed
- Internal caches were invalidated

Refresh causes the client to restart whichever pull mechanism is active.

---

## 3. Diagnostic Flow

### 3.1 Workspace Diagnostics OFF

#### OPEN DOCUMENT

Client → document pull

- Server computes diagnostics (sync + cached)
- Immediate results → returned via pull

Async analysis (ReDoS):

- Completes later → push diagnostics (publishDiagnostics)

#### CLOSED DOCUMENT

```
No workspace pull → no diagnostics produced
```

---

### 3.2 Workspace Diagnostics ON

Client → workspace/diagnostic (streaming, long-running)

Server streams:

- Diagnostics for closed documents
- Diagnostics for open documents
- Async results (ReDoS, heavy analysis)
- Incremental updates

Client still performs document pulls for open documents:

- Document pull diagnostics override workspace diagnostics

---

## 4. Decision Logic (Server Side)

On file open or change:

- Client pulls document diagnostics
- Server returns synchronous diagnostics
- Server schedules async tasks (ReDoS, heavy checks)

```
If workspace diagnostics are ON:
    Async results → workspace pull stream
Else:
    Async results → push publishDiagnostics
```

On async task completion:

```
If workspace diagnostics are ON:
    stream via workspace diagnostics
Else:
    push publishDiagnostics
```

On workspace structure change:

- Server sends refresh
- Client restarts workspace or doc pulls depending on settings

---

## 5. Why This Architecture

### Unified logic

When workspace diagnostics are enabled, a single mechanism (workspace pull) handles all diagnostic
delivery, simplifying lifecycle management.

### Spec-compliant

Document pull diagnostics override workspace diagnostics, ensuring correct behavior for open files.

### Efficient

Workspace pull is suited for long-running and incremental analysis on large projects.

### Predictable

Contributors only need to understand one switch:

```
if workspaceDiagnosticsEnabled:
    route all diagnostics through workspace pull
else:
    route async via push and sync via document pull
```

---

## 6. Summary Table

| Condition                              | Delivery Method         |
| -------------------------------------- | ----------------------- |
| Sync diagnostics for open documents    | Document Pull           |
| Async diagnostics — workspace ON       | Workspace Pull          |
| Async diagnostics — workspace OFF      | Push Diagnostics        |
| Diagnostics for closed documents — ON  | Workspace Pull          |
| Diagnostics for closed documents — OFF | Not delivered           |
| State invalidation                     | Refresh → restart pulls |

---
