import * as vscode from "vscode";
import { EntryType } from "./EntryType";

export type RegexEntry = vscode.TreeItem & {
    type: EntryType.Regex;
};

const regexIcon = new vscode.ThemeIcon("regex");

export function createRegexEntry(label: string, uri: vscode.Uri): RegexEntry {
    return {
        type: EntryType.Regex,
        label,
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        iconPath: regexIcon,
        resourceUri: uri,
    };
}
