import type { IFileSystemProvider } from './provider';

export type OnDidChangeFileHandler = Parameters<IFileSystemProvider['onDidChangeFile']>[0];
