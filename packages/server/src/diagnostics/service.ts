import type { Diagnostic, TextDocumentChangeEvent } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

import { Implements, Injectable, createInterfaceId } from '@gitlab/needle';

import { LsConnection } from '../di/external-interfaces';
import { IOnTextDocumentDidChangeHandler, IOnTextDocumentDidCloseHandler } from '../documents';

export interface IDiagnosticService {
    publish(uri: string, diagnostics: Diagnostic[], version: number): void;
}

export const IDiagnosticService = createInterfaceId<IDiagnosticService>('IDiagnosticService');

type TimeoutId = ReturnType<typeof setTimeout>;

@Implements(IOnTextDocumentDidChangeHandler)
@Implements(IOnTextDocumentDidCloseHandler)
@Injectable(IDiagnosticService, [LsConnection])
export class DiagnosticService
    implements IDiagnosticService, IOnTextDocumentDidChangeHandler, IOnTextDocumentDidCloseHandler
{
    /**
     * TODO: allow the persistance of certain diagnostics / workspace diagnostics
     * best to seperate workspace diagnostics (including push diagnostics) from pull diagnostics
     * have some kind of interop to avoid double work, but in general open documents should work with pull
     * the rest of the workspace with push (and fs watchers to detect changes)
     */
    private trackers = new Map<string, { version: number; diagnostics: Diagnostic[] }>();
    private timeouts = new Map<string, TimeoutId>();

    constructor(private readonly connection: LsConnection) {}

    publish(uri: string, diagnostics: Diagnostic[], version: number): void {
        this.removePendingClear(uri);
        let tracker = this.trackers.get(uri);
        if (!tracker || version > tracker.version) {
            tracker = this.createEmptyTracker(uri, version);
        }
        if (version < tracker.version) {
            return;
        }
        tracker.diagnostics.push(...diagnostics);
        this.connection.sendDiagnostics({
            uri,
            version,
            diagnostics: tracker.diagnostics,
        });
    }

    onTextDocumentDidChange(event: TextDocumentChangeEvent<TextDocument>): void {
        const { uri, version } = event.document;
        const tracker = this.trackers.get(uri);
        if (!tracker) {
            return;
        }
        if (tracker.version < version) {
            this.createEmptyTracker(uri, version);
            this.setPendingClear(uri, version);
        }
    }

    onTextDocumentDidClose(event: TextDocumentChangeEvent<TextDocument>): void {
        const { uri, version } = event.document;
        this.trackers.delete(event.document.uri);
        // if a document closes, clear the diagnostics we send
        this.connection.sendDiagnostics({
            uri,
            version,
            diagnostics: [],
        });
    }

    private setPendingClear(uri: string, version: number) {
        const pending = this.timeouts.get(uri);
        if (pending) {
            clearTimeout(pending);
        }
        this.timeouts.set(
            uri,
            setTimeout(() => {
                this.trackers.delete(uri);
                this.connection.sendDiagnostics({
                    uri,
                    version,
                    diagnostics: [],
                });
            }, 10),
        );
    }

    private removePendingClear(uri: string) {
        const pending = this.timeouts.get(uri);
        if (pending) {
            clearTimeout(pending);
            this.timeouts.delete(uri);
        }
    }

    private createEmptyTracker(uri: string, version: number) {
        const tracker = { version, diagnostics: [] };
        this.trackers.set(uri, tracker);
        return tracker;
    }
}
