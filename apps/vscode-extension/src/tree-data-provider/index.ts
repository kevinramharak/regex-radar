import * as vscode from "vscode";
import { Element, RegexRadarTreeDataProvider } from "./RegexRadarTreeDataProvider";

export function registerTreeView(context: vscode.ExtensionContext): vscode.TreeView<Element> {
    const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
    const treeView = vscode.window.createTreeView("regex-radar", {
        treeDataProvider: new RegexRadarTreeDataProvider(workspaceFolders),
        showCollapseAll: true,
    });
    context.subscriptions.push(treeView);

    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders((event) => {
            // TODO: refresh treeView with new workspace folders
            // @see https://github.com/microsoft/vscode/wiki/Adopting-Multi-Root-Workspace-APIs
        })
    );

    return treeView;
}
