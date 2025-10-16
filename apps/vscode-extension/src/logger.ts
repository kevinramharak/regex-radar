import { LogOutputChannel, window } from "vscode";
import { displayName } from "../package.json";

let instance: null | LogOutputChannel = null;

function logger(): LogOutputChannel {
    if (instance !== null) {
        return instance;
    }
    instance = window.createOutputChannel(`${displayName} (client)`, { log: true });
    return instance;
}

export function info(...args: Parameters<LogOutputChannel["info"]>) {
    logger().info(...args);
}

export function trace(...args: Parameters<LogOutputChannel["trace"]>) {
    logger().trace(...args);
}

export function debug(...args: Parameters<LogOutputChannel["debug"]>) {
    logger().debug(...args);
}
export function warn(...args: Parameters<LogOutputChannel["warn"]>) {
    logger().warn(...args);
}

export function error(...args: Parameters<LogOutputChannel["error"]>) {
    logger().error(...args);
}

export function dispose() {
    if (instance !== null) {
        instance.dispose();
        instance = null;
    }
}
