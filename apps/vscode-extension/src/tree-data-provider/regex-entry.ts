import * as vscode from "vscode";
import { EntryType } from "./EntryType";

export type RegexEntry = vscode.TreeItem & {
    type: EntryType.Regex;
    name: string;
};

const regexIcon = new vscode.ThemeIcon("regex");

export function createRegexEntry(name: string): RegexEntry {
    return {
        type: EntryType.Regex,
        name,
        label: name,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        iconPath: regexIcon,
    };
}
