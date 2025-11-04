import * as vscode from 'vscode';

import { RegexRadarLanguageClient } from '@regex-radar/client';
import { Entry, RegexEntry } from '@regex-radar/lsp-types';

import * as logger from '../logger';

import { RegexRadarTreeDataProvider } from './RegexRadarTreeDataProvider';

function buildQuery(params: Record<string, string>) {
    return Object.entries(params)
        .reduce((result, [key, value]) => {
            result += `${key}=${encodeURIComponent(value)}&`;
            return result;
        }, '')
        .slice(0, -1);
}

function createParams(entry: RegexEntry): Record<string, string> {
    const params: Record<string, string> = {
        expression: entry.match.pattern,
    };
    if ('flags' in entry.match) {
        params['flags'] = entry.match.flags;
    }
    return params;
}

function createRegExrUri(entry: RegexEntry): vscode.Uri {
    return vscode.Uri.from({
        scheme: 'https',
        authority: 'regexr.com',
        path: '/',
        query: buildQuery(createParams(entry)),
    });
}

function createRegex101Uri(entry: RegexEntry): vscode.Uri {
    return vscode.Uri.from({
        scheme: 'https',
        authority: 'regex101.com',
        path: '/',
        query: buildQuery(createParams(entry)),
    });
}

function createTreeViewOptions(provider: RegexRadarTreeDataProvider): vscode.TreeViewOptions<Entry> {
    return {
        treeDataProvider: provider,
        showCollapseAll: true,
    };
}

function createTreeViews(options: vscode.TreeViewOptions<Entry>) {
    const explorerTreeView = vscode.window.createTreeView('regex-radar.explorer.tree-view', options);
    const regexExplorerTreeView = vscode.window.createTreeView(
        'regex-radar.regex-explorer.tree-view',
        options,
    );
    return { explorerTreeView, regexExplorerTreeView };
}

function createRevealCommandHandler(
    explorerTreeView: vscode.TreeView<Entry>,
    regexExplorerTreeView: vscode.TreeView<Entry>,
) {
    return async (entry: RegexEntry) => {
        const options = {
            select: true,
            focus: true,
            expand: false,
        };
        if (explorerTreeView.visible) {
            return await explorerTreeView.reveal(entry, options);
        }
        return await regexExplorerTreeView.reveal(entry, options);
    };
}

export function registerTreeView(client: RegexRadarLanguageClient, context: vscode.ExtensionContext) {
    const treeDataProvider = new RegexRadarTreeDataProvider(client);
    const options = createTreeViewOptions(treeDataProvider);
    const { explorerTreeView, regexExplorerTreeView } = createTreeViews(options);

    context.subscriptions.push(explorerTreeView, regexExplorerTreeView);
    context.subscriptions.push(
        vscode.commands.registerCommand('regex-radar.tree-data-provider.refresh', () =>
            treeDataProvider.refresh(),
        ),
        vscode.workspace.onDidChangeWorkspaceFolders((event) => treeDataProvider.refresh()),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('regex-radar.tree-data-provider.openInRegExr', (entry: RegexEntry) =>
            vscode.commands.executeCommand('vscode.open', createRegExrUri(entry).toString(true)),
        ),
        vscode.commands.registerCommand(
            'regex-radar.tree-data-provider.openInRegex101',
            (entry: RegexEntry) =>
                vscode.commands.executeCommand('vscode.open', createRegex101Uri(entry).toString(true)),
        ),
        vscode.commands.registerCommand(
            'regex-radar.tree-data-provider.reveal',
            createRevealCommandHandler(explorerTreeView, regexExplorerTreeView),
        ),
    );
}
