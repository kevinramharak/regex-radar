import * as vscode from "vscode";

import { EntryType } from "./EntryType";
import { createWorkspaceEntry, WorkspaceEntry } from "./workspace-entry";
import { createDirectoryEntry, DirectoryEntry } from "./directory-entry";
import { createFileEntry, FileEntry } from "./file-entry";
import { createRegexEntry, RegexEntry } from "./regex-entry";

import * as logger from "../logger";
import { RegexRadarLanguageClient } from "../client";

export type Element = WorkspaceEntry | DirectoryEntry | FileEntry | RegexEntry;

/**
 * @see https://code.visualstudio.com/api/extension-guides/tree-view
 */
export class RegexRadarTreeDataProvider implements vscode.TreeDataProvider<Element> {
    constructor(
        private readonly client: RegexRadarLanguageClient,
        private readonly workspaceFolders: readonly vscode.WorkspaceFolder[]
    ) {}

    getTreeItem(element: Element): Element {
        return element;
    }

    async getChildren(element?: Element): Promise<Element[]> {
        if (!element) {
            return this.getRoot();
        }
        const uri = element.resourceUri;
        if (!uri) {
            return [];
        }

        switch (element.type) {
            case EntryType.Workspace:
            case EntryType.Directory:
            case EntryType.File: {
                const response: any = await this.client.getTreeViewChildren(uri, element.type);
                return response.children.map((entry: any) => {
                    const uri = vscode.Uri.parse(entry.uri);
                    switch (entry.type) {
                        case EntryType.Workspace: {
                            return createWorkspaceEntry(uri);
                        }
                        case EntryType.Directory: {
                            return createDirectoryEntry(uri);
                        }
                        case EntryType.File: {
                            return createFileEntry(uri);
                        }
                        case EntryType.Regex: {
                            return createRegexEntry(`/${entry.pattern}/${entry.flags}`, uri);
                        }
                    }
                });
            }
        }

        return [];
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
