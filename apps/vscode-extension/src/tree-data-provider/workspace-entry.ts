import * as vscode from "vscode";
import { EntryType } from "./EntryType";

export type WorkspaceEntry = vscode.TreeItem & {
    type: EntryType.Workspace;
    resourceUri: vscode.Uri;
};

export function createWorkspaceEntry(uri: vscode.Uri): WorkspaceEntry {
    return {
        type: EntryType.Workspace,
        resourceUri: uri,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        iconPath: vscode.ThemeIcon.Folder,
    };
}
