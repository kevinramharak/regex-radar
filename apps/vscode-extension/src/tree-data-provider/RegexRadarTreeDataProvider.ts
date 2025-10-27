import * as vscode from "vscode";
import {
    EntryType,
    Entry,
    WorkspaceEntry,
    DirectoryEntry,
    FileEntry,
    RegexEntry,
} from "@regex-radar/lsp-types";
import { RegexRadarLanguageClient } from "@regex-radar/client";
import * as logger from "../logger";

type OnDidChangeTreeDataEventParams = Entry | undefined | null | void;

/**
 * @see https://code.visualstudio.com/api/extension-guides/tree-view
 */
export class RegexRadarTreeDataProvider implements vscode.TreeDataProvider<Entry> {
    private _onDidChangeTreeData = new vscode.EventEmitter<OnDidChangeTreeDataEventParams>();
    readonly onDidChangeTreeData: vscode.Event<OnDidChangeTreeDataEventParams> =
        this._onDidChangeTreeData.event;

    private entries = new Map<string, Exclude<Entry, RegexEntry>>();

    refresh(): void {
        this.entries.clear();
        this._onDidChangeTreeData.fire();
    }

    constructor(private readonly client: RegexRadarLanguageClient) {
        client.onDiscoveryDidChange(({ uri }: { uri: string }) => {
            const entry = this.entries.get(uri);
            if (!entry) {
                return;
            }
            this.entries.delete(uri);
            this._onDidChangeTreeData.fire(entry);
        });
    }

    getParent(entry: Entry): vscode.ProviderResult<Entry> {
        switch (entry.type) {
            case EntryType.Workspace: {
                return;
            }
            case EntryType.Directory:
            case EntryType.File: {
                if (!entry.parentUri) {
                    return;
                }
                return this.entries.get(entry.parentUri);
            }
            case EntryType.Regex: {
                return this.entries.get(entry.location.uri);
            }
        }
    }

    getTreeItem(entry: Entry): vscode.TreeItem {
        return createTreeItem(entry);
    }

    async getChildren(entry?: Entry): Promise<Entry[]> {
        if (!entry) {
            const root = (await this.getRoot()) as Exclude<Entry, RegexEntry>[];
            root.forEach((entry) => this.entries.set(entry.uri, entry));
            return root;
        }
        if (entry.type === EntryType.Regex) {
            return [];
        }
        const serverEntry = await this.client.discovery({ uri: entry.uri, hint: entry.type });
        switch (serverEntry?.type) {
            case EntryType.Workspace:
            case EntryType.Directory:
            case EntryType.File: {
                this.entries.set(serverEntry.uri, serverEntry);
                return serverEntry.children;
            }
            default:
                return [];
        }
    }

    async getRoot(): Promise<Entry[]> {
        const workspaces = this.getWorkspaceURIs();
        const workspaceEntries = workspaces.map((uri): WorkspaceEntry => {
            return {
                type: EntryType.Workspace,
                uri,
                children: [],
            };
        });
        if (workspaceEntries.length === 1) {
            // skip 1 level if there is only 1 workspace active
            return this.getChildren(workspaceEntries[0]);
        }
        return workspaceEntries;
    }

    getWorkspaceURIs(): string[] {
        if (vscode.workspace.workspaceFolders) {
            return vscode.workspace.workspaceFolders.map((workspaceFolder) => workspaceFolder.uri.toString());
        }
        logger.warn("missing vsode.workspace.workspaceFolders");
        return [];
    }
}

const ThemeIcon: Record<EntryType, vscode.ThemeIcon> = {
    [EntryType.Unknown]: new vscode.ThemeIcon("circle-filled"),
    [EntryType.Workspace]: new vscode.ThemeIcon("root-folder"),
    [EntryType.Directory]: vscode.ThemeIcon.Folder,
    [EntryType.File]: vscode.ThemeIcon.File,
    [EntryType.Regex]: new vscode.ThemeIcon("regex"),
};

function createTreeItem(entry: Entry): vscode.TreeItem {
    const iconPath = ThemeIcon[entry.type] || ThemeIcon[EntryType.Unknown];
    switch (entry.type) {
        case EntryType.Workspace:
        case EntryType.Directory:
        case EntryType.File: {
            return createUriEntry(entry, iconPath);
        }
        case EntryType.Regex: {
            return createRegexEntry(entry, iconPath);
        }
        default: {
            return {
                label: `<invalid entry with type ${EntryType[entry["type"]] || "<invalid>"}>`,
                iconPath,
            };
        }
    }
}
function createRegexEntry(entry: RegexEntry, iconPath: vscode.ThemeIcon) {
    const args: [string, vscode.TextDocumentShowOptions] = [
        entry.location.uri,
        {
            selection: new vscode.Range(
                entry.location.range.start.line,
                entry.location.range.start.character,
                entry.location.range.end.line,
                entry.location.range.end.character
            ),
        },
    ];
    return {
        label: `/${entry.info.pattern}/${entry.info.flags}`,
        iconPath,
        contextValue: "regex",
        command: {
            command: "vscode.open",
            title: "Open",
            arguments: args,
        },
    };
}

function createUriEntry(
    entry: WorkspaceEntry | DirectoryEntry | FileEntry,
    iconPath: vscode.ThemeIcon
): vscode.TreeItem {
    return {
        resourceUri: vscode.Uri.parse(entry.uri),
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        iconPath,
    };
}
