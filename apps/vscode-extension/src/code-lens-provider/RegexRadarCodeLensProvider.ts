import { RegexRadarLanguageClient } from "@regex-radar/client";
import { EntryType } from "@regex-radar/lsp-types";
import * as vscode from "vscode";

export class RegexRadarCodeLensProvider implements vscode.CodeLensProvider {
    constructor(private readonly client: RegexRadarLanguageClient) {}

    // TODO: which commands should be part of code lens, which on context menu (right click)?
    async provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeLens[]> {
        const entry = await this.client.discovery(
            { uri: document.uri.toString(), hint: EntryType.File },
            token
        );
        if (!entry || entry.type !== EntryType.File) {
            return [];
        }
        return entry.children.map((entry) => {
            return {
                isResolved: true,
                range: this.client.protocol2CodeConverter.asRange(entry.location.range),
                command: {
                    command: "regex-radar.tree-data-provider.reveal",
                    title: "Regex Explorer",
                    tooltip: "Reveal in the Regex Explorer",
                    arguments: [entry],
                },
            };
        });
    }
}
