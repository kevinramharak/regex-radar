import type { Range } from 'vscode-languageserver';

/**
 * Test if range `a` is in range `b`. Check is inclusive (`>=`, `<=`).
 * If either `start` or `end` is out of range `false` will be returned
 */
export function isInRange(a: Range, b: Range) {
    return (
        a.start.line >= b.start.line &&
        a.start.character >= b.start.character &&
        a.end.line <= b.end.line &&
        a.end.character <= b.end.character
    );
}
