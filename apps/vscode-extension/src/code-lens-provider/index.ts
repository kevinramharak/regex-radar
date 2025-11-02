import * as vscode from 'vscode';

import { RegexRadarLanguageClient } from '@regex-radar/client';

import { RegexRadarCodeLensProvider } from './RegexRadarCodeLensProvider';

export function registerCodeLens(client: RegexRadarLanguageClient, context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            [{ language: 'typescript' }, { language: 'javascript' }],
            new RegexRadarCodeLensProvider(client),
        ),
    );
}
