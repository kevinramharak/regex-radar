import * as vscode from "vscode";
import { RegexRadarTreeDataProvider } from "./RegexRadarTreeDataProvider";
import { RegexRadarLanguageClient } from "@regex-radar/client";
import { Entry, RegexEntry } from "@regex-radar/lsp-types";
import * as logger from "../logger";

export function registerTreeView(client: RegexRadarLanguageClient, context: vscode.ExtensionContext) {
    const treeDataProvider = new RegexRadarTreeDataProvider(client);
    const options: vscode.TreeViewOptions<Entry> = {
        treeDataProvider,
        showCollapseAll: true,
    };
    const explorerTreeView = vscode.window.createTreeView("regex-radar.explorer.tree-view", options);
    const regexExplorerTreeView = vscode.window.createTreeView(
        "regex-radar.regex-explorer.tree-view",
        options
    );
    context.subscriptions.push(explorerTreeView, regexExplorerTreeView);

    context.subscriptions.push(
        vscode.commands.registerCommand("regex-radar.tree-data-provider.refresh", () =>
            treeDataProvider.refresh()
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "regex-radar.tree-data-provider.openInRegExr",
            (entry: RegexEntry) => {
                const uri = vscode.Uri.from({
                    scheme: "https",
                    authority: "regexr.com",
                    path: "/",
                    query: `expression=${encodeURIComponent(entry.info.pattern)}&flags=${encodeURIComponent(entry.info.flags)}`,
                });
                vscode.commands.executeCommand("vscode.open", uri.toString(true));
            }
        ),
        vscode.commands.registerCommand(
            "regex-radar.tree-data-provider.openInRegex101",
            (entry: RegexEntry) => {
                const uri = vscode.Uri.from({
                    scheme: "https",
                    authority: "regex101.com",
                    path: "/",
                    query: `regex=${encodeURIComponent(entry.info.pattern)}&flags=${encodeURIComponent(entry.info.flags)}`,
                });
                vscode.commands.executeCommand("vscode.open", uri.toString(true));
            }
        ),
        vscode.commands.registerCommand(
            "regex-radar.tree-data-provider.reveal",
            async (entry: RegexEntry) => {
                const options = {
                    select: true,
                    focus: true,
                    expand: false,
                };
                if (explorerTreeView.visible) {
                    return await explorerTreeView.reveal(entry, options);
                }
                return await regexExplorerTreeView.reveal(entry, options);
            }
        ),
        vscode.commands.registerCommand("regex-radar.test", async (entry: RegexEntry) => {})
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders((event) => {
            treeDataProvider.refresh();
        })
    );
}
