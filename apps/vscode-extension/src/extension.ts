import * as vscode from "vscode";
import * as logger from "./logger";
import { registerTreeView } from "./tree-data-provider";
import { registerLanguageClient } from "./client";

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(logger);
    logger.info("activating");

    registerTreeView(context);
    registerLanguageClient(context);
}

export function deactivate() {
    logger.info("deactivating");
}
