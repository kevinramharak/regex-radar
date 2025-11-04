import type { IFileSystemProvider } from './system';

export type OnDidChangeFileHandler = Parameters<IFileSystemProvider['onDidChangeFile']>[0];
