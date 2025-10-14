import type { ExtensionContext } from "vscode";

export function activate(context: ExtensionContext) {
    console.log("activate");
}

export function deactivate() {
    console.log("deactivate");
}
