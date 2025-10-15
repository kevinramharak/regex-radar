import * as vscode from "vscode";
import { EntryType } from "./EntryType";

export type DirectoryEntry = vscode.TreeItem & {
    type: EntryType.Directory;
    resourceUri: vscode.Uri;
};

export function createDirectoryEntry(uri: vscode.Uri): DirectoryEntry {
    return {
        type: EntryType.Directory,
        resourceUri: uri,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        iconPath: vscode.ThemeIcon.Folder,
    };
}
