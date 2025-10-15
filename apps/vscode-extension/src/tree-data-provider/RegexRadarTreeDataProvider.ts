import * as vscode from "vscode";
import { EntryType } from "./EntryType";
import { createWorkspaceEntry, WorkspaceEntry } from "./workspace-entry";
import { createDirectoryEntry, DirectoryEntry } from "./directory-entry";
import { createFileEntry, FileEntry } from "./file-entry";
import { createRegexEntry, RegexEntry } from "./regex-entry";

export type Element = WorkspaceEntry | DirectoryEntry | FileEntry | RegexEntry;

/**
 * @see https://code.visualstudio.com/api/extension-guides/tree-view
 */
export class RegexRadarTreeDataProvider implements vscode.TreeDataProvider<Element> {
    constructor(private readonly workspaceFolders: readonly vscode.WorkspaceFolder[]) {}

    getTreeItem(element: Element): Element {
        return element;
    }

    async getChildren(element?: Element): Promise<Element[]> {
        if (!element) {
            return this.getRoot();
        }
        switch (element.type) {
            case EntryType.Workspace:
            case EntryType.Directory: {
                // TODO: use vscode.fs API or move this to language server?
                const entries = await vscode.workspace.fs.readDirectory(element.resourceUri);
                return entries
                    .map(([name, type]) => {
                        const uri = vscode.Uri.joinPath(element.resourceUri, name);
                        switch (type) {
                            case vscode.FileType.File: {
                                return createFileEntry(uri);
                            }
                            case vscode.FileType.Directory: {
                                return createDirectoryEntry(uri);
                            }
                            default: {
                                return null;
                            }
                        }
                    })
                    .filter((element) => element != null);
            }
            case EntryType.File: {
                const uri = element.resourceUri;
                // ask LS what regexes can be found in file.
            }
            default: {
                return Promise.resolve([]);
            }
        }
    }

    async getRoot(): Promise<Element[]> {
        const elements = this.workspaceFolders.map((workspaceFolder) =>
            createWorkspaceEntry(workspaceFolder.uri)
        );
        // if there is only 1 workspace, use it as root to skip 1 nesting level
        if (elements.length === 1) {
            return this.getChildren(elements[0]);
        }
        return Promise.resolve(elements);
    }
}
