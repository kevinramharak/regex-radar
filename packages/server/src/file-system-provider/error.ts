// based on  https://github.com/microsoft/vscode/blob/main/src/vs/platform/files/common/files.ts

export enum FileSystemProviderErrorCode {
    FileExists = 'EntryExists',
    FileNotFound = 'EntryNotFound',
    FileNotADirectory = 'EntryNotADirectory',
    FileIsADirectory = 'EntryIsADirectory',
    FileExceedsStorageQuota = 'EntryExceedsStorageQuota',
    FileTooLarge = 'EntryTooLarge',
    FileWriteLocked = 'EntryWriteLocked',
    NoPermissions = 'NoPermissions',
    Unavailable = 'Unavailable',
    Unknown = 'Unknown',
    /**
     * Not part of VS Code API
     */
    NotSupported = 'NotSupported',
}

export interface FileSystemProviderError extends Error {
    readonly name: string;
    readonly code: FileSystemProviderErrorCode;
}

export class FileSystemProviderError extends Error {
    static create(error: Error | string, code: FileSystemProviderErrorCode): FileSystemProviderError {
        const providerError = new FileSystemProviderError(error.toString(), code);
        markAsFileSystemProviderError(providerError, code);

        return providerError;
    }

    private constructor(
        message: string,
        readonly code: FileSystemProviderErrorCode,
        cause?: Error | string,
    ) {
        super(message, { cause });
    }
}

export function createFileSystemProviderError(
    error: Error | string,
    code: FileSystemProviderErrorCode,
): FileSystemProviderError {
    return FileSystemProviderError.create(error, code);
}

export function markAsFileSystemProviderError(error: Error, code: FileSystemProviderErrorCode): Error {
    error.name = code ? `${code} (FileSystemError)` : `FileSystemError`;
    return error;
}

export function toFileSystemProviderErrorCode(error: Error | undefined | null): FileSystemProviderErrorCode {
    if (!error) {
        return FileSystemProviderErrorCode.Unknown;
    }

    if (error instanceof FileSystemProviderError) {
        return error.code;
    }

    const match = /^(.+) \(FileSystemError\)$/.exec(error.name);
    if (!match) {
        return FileSystemProviderErrorCode.Unknown;
    }

    switch (match[1]) {
        case FileSystemProviderErrorCode.FileExists:
            return FileSystemProviderErrorCode.FileExists;
        case FileSystemProviderErrorCode.FileIsADirectory:
            return FileSystemProviderErrorCode.FileIsADirectory;
        case FileSystemProviderErrorCode.FileNotADirectory:
            return FileSystemProviderErrorCode.FileNotADirectory;
        case FileSystemProviderErrorCode.FileNotFound:
            return FileSystemProviderErrorCode.FileNotFound;
        case FileSystemProviderErrorCode.FileTooLarge:
            return FileSystemProviderErrorCode.FileTooLarge;
        case FileSystemProviderErrorCode.FileWriteLocked:
            return FileSystemProviderErrorCode.FileWriteLocked;
        case FileSystemProviderErrorCode.NoPermissions:
            return FileSystemProviderErrorCode.NoPermissions;
        case FileSystemProviderErrorCode.NotSupported:
            return FileSystemProviderErrorCode.NotSupported;
        case FileSystemProviderErrorCode.Unavailable:
            return FileSystemProviderErrorCode.Unavailable;
        default:
            return FileSystemProviderErrorCode.Unknown;
    }
}
