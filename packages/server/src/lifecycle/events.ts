import type {
    RequestHandler,
    InitializeParams,
    InitializeResult,
    InitializedParams,
    InitializeError,
} from "vscode-languageserver";
import { createInterfaceId } from "@gitlab/needle";

export interface IOnInitialize {
    onInitialize: RequestHandler<InitializeParams, InitializeResult, InitializeError>;
}

export const IOnInitialize = createInterfaceId<IOnInitialize>("IOnInitialize");

export interface IOnInitialized {
    onInitialized(params: InitializedParams): void | Promise<void>;
}

export const IOnInitialized = createInterfaceId<IOnInitialized>("IOnInitialized");

// TODO: add set/log trace notifications

export interface IOnShutdown {
    onShutdown(): void | Promise<void>;
}

export const IOnShutdown = createInterfaceId<IOnShutdown>("IOnShutdown");

export interface IOnExit {
    onExit(): void | Promise<void>;
}

export const IOnExit = createInterfaceId<IOnExit>("IOnExit");
