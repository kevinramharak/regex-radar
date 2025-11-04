import {
    createFileSystemProviderError,
    FileSystemProviderError,
    FileSystemProviderErrorCode,
} from '../error';

export function toFileSystemProviderError(error: NodeJS.ErrnoException): FileSystemProviderError {
    if (error instanceof FileSystemProviderError) {
        return error;
    }

    let code: FileSystemProviderErrorCode;
    switch (error.code) {
        case 'ENOENT':
            code = FileSystemProviderErrorCode.FileNotFound;
            break;
        case 'EISDIR':
            code = FileSystemProviderErrorCode.FileIsADirectory;
            break;
        case 'ENOTDIR':
            code = FileSystemProviderErrorCode.FileNotADirectory;
            break;
        case 'EEXIST':
            code = FileSystemProviderErrorCode.FileExists;
            break;
        case 'EPERM':
        case 'EACCES':
            code = FileSystemProviderErrorCode.NoPermissions;
            break;
        case 'ENOTSUP':
            code = FileSystemProviderErrorCode.NotSupported;
            break;
        default:
            code = FileSystemProviderErrorCode.Unknown;
            break;
    }

    const err = createFileSystemProviderError(error, code);
    return err;
}
