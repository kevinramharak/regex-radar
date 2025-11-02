/**
 * @see https://code.visualstudio.com/api/references/vscode-api#FileType
 */
export enum FileType {
    Unknown = 0,
    File = 1,
    Directory = 2,
    SymbolicLink = 64,
}

/**
 * @see https://code.visualstudio.com/api/references/vscode-api#FilePermission
 */
export enum FilePermission {
    /**
     * NOTE: `Unknown` is not part of the vscode api, but we need a default value
     */
    Unknown = 0,
    Readonly = 1,
}
