import { Connection, TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { createInterfaceId } from '@gitlab/needle';

export type LsConnection = Connection;
export const LsConnection = createInterfaceId<LsConnection>('LsConnection');

export type LsTextDocuments = TextDocuments<TextDocument>;
export const LsTextDocuments = createInterfaceId<LsTextDocuments>('LsTextDocuments');
