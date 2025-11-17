import type { CancellationToken, CodeLens, CodeLensParams } from 'vscode-languageserver';

import { createInterfaceId } from '@gitlab/needle';

import type { MaybePromise } from '../util/maybe-promise';

export interface IOnCodeLens {
    onCodeLens(params: CodeLensParams, token?: CancellationToken): MaybePromise<CodeLens[]>;
}

export const IOnCodeLens = createInterfaceId<IOnCodeLens>('IOnCodeLens');

export interface IOnCodeLensResolve {
    onCodeLensResolve(lens: CodeLens, token?: CancellationToken): MaybePromise<CodeLens>;
}

export const IOnCodeLensResolve = createInterfaceId<IOnCodeLensResolve>('IOnCodeLensResolve');
