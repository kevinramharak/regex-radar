import type { DidChangeTextDocumentParams } from 'vscode-languageserver';
import type { TextDocumentContentChangeEvent } from 'vscode-languageserver-textdocument';

import { createInterfaceId } from '@gitlab/needle';

import type { LsTextDocuments } from '../di';

type NotificationEventType =
    | 'onDidChangeContent'
    | 'onDidClose'
    | 'onDidOpen'
    | 'onDidSave'
    | 'onWillSave'
    | 'onWillSaveWaitUntil';
type ExtractEventType<Type extends NotificationEventType> = Parameters<
    Parameters<LsTextDocuments[Type]>[0]
>[0];

type RequestEventType = 'onWillSaveWaitUntil';
type ExtractEventHandler<Type extends RequestEventType> = Parameters<LsTextDocuments[Type]>[0];

/**
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_didOpen
 */
export interface IOnTextDocumentDidOpenHandler {
    onTextDocumentDidOpen(event: ExtractEventType<'onDidOpen'>): void;
}

export const IOnTextDocumentDidOpenHandler = createInterfaceId<IOnTextDocumentDidOpenHandler>(
    'IOnTextDocumentDidOpenHandler',
);

/**
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_didChange
 */
export interface IOnTextDocumentDidChangeHandler {
    onTextDocumentDidChange(event: ExtractEventType<'onDidChangeContent'>): void;
}

export const IOnTextDocumentDidChangeHandler = createInterfaceId<IOnTextDocumentDidChangeHandler>(
    'IOnTextDocumentDidChangeHandler',
);

/**
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_willSave
 */
export interface IOnTextDocumentWillSaveHandler {
    onTextDocumentWillSave(event: ExtractEventType<'onWillSave'>): void;
}

export const IOnTextDocumentWillSaveHandler = createInterfaceId<IOnTextDocumentWillSaveHandler>(
    'IOnTextDocumentWillSaveHandler',
);

/**
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_willSaveWaitUntil
 */
export interface IOnTextDocumentWillSaveWaitUntilHandler {
    onTextDocumentWillSaveUntil: ExtractEventHandler<'onWillSaveWaitUntil'>;
}

export const IOnTextDocumentWillSaveWaitUntilHandler =
    createInterfaceId<IOnTextDocumentWillSaveWaitUntilHandler>('IOnTextDocumentWillSaveWaitUntilHandler');

/**
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_didSave
 */
export interface IOnTextDocumentDidSaveHandler {
    onTextDocumentDidSave(event: ExtractEventType<'onDidSave'>): void;
}

export const IOnTextDocumentDidSaveHandler = createInterfaceId<IOnTextDocumentDidSaveHandler>(
    'IOnTextDocumentDidSaveHandler',
);

/**
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_didClose
 */
export interface IOnTextDocumentDidCloseHandler {
    onTextDocumentDidClose(event: ExtractEventType<'onDidClose'>): void;
}

export const IOnTextDocumentDidCloseHandler = createInterfaceId<IOnTextDocumentDidCloseHandler>(
    'IOnTextDocumentDidCloseHandler',
);

// TODO: add notebook events, see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#notebookDocument_synchronization
