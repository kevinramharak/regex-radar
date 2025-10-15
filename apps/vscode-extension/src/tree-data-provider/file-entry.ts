import * as vscode from "vscode";
import { EntryType } from "./EntryType";

export type FileEntry = vscode.TreeItem & {
    type: EntryType.File;
    resourceUri: vscode.Uri;
};

export function createFileEntry(uri: vscode.Uri): FileEntry {
    return {
        type: EntryType.File,
        resourceUri: uri,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        iconPath: vscode.ThemeIcon.File,
    };
}
