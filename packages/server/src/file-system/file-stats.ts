// based on https://github.com/microsoft/vscode/blob/main/src/vs/platform/files/common/files.ts

/**
 * @see https://code.visualstudio.com/api/references/vscode-api#FileType
 */
export enum FileType {
    /**
     * File is unknown (neither file, directory nor symbolic link).
     */
    Unknown = 0,
    File = 1,
    Directory = 2,
    /**
     * File is a symbolic link.
     *
     * Note: even when the file is a symbolic link, you can test for
     * `FileType.File` and `FileType.Directory` to know the type of
     * the target the link points to.
     */
    SymbolicLink = 64,
}

/**
 * @see https://code.visualstudio.com/api/references/vscode-api#FilePermission
 */
export enum FilePermission {
    Readonly = 1,
}
