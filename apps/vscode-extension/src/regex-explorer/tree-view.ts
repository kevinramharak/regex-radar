import { type TreeView, type ExtensionContext, window, commands } from 'vscode';

import { RegexRadarLanguageClient } from '@regex-radar/client';
import { Entry, RegexEntry } from '@regex-radar/lsp-types';

import { RegexRadarTreeDataProvider } from './tree-data-provider';

// TODO: this should reveal + open a quickpick with the commands a user can invoke on a RegexEntry
// - open in external tool
// - visualize
// - text matcher in side panel
function createRevealCommandHandler(
    explorerTreeView: TreeView<Entry>,
    regexExplorerTreeView: TreeView<Entry>,
) {
    return async (entry: RegexEntry) => {
        const treeView = explorerTreeView.visible ? explorerTreeView : regexExplorerTreeView;
        await treeView.reveal(entry, {
            select: true,
            focus: true,
            expand: true,
        });
    };
}

export function registerTreeView(client: RegexRadarLanguageClient, context: ExtensionContext) {
    const treeDataProvider = new RegexRadarTreeDataProvider(client);
    const options = {
        treeDataProvider,
        showCollapseAll: true,
    };
    const explorerTreeView = window.createTreeView('regex-radar.explorer.tree-view', options);
    const regexExplorerTreeView = window.createTreeView('regex-radar.regex-explorer.tree-view', options);

    context.subscriptions.push(
        explorerTreeView,
        regexExplorerTreeView,
        commands.registerCommand('regex-radar.tree-data-provider.refresh', () => treeDataProvider.refresh()),
        commands.registerCommand(
            'regex-radar.tree-data-provider.reveal',
            createRevealCommandHandler(explorerTreeView, regexExplorerTreeView),
        ),
    );
}
