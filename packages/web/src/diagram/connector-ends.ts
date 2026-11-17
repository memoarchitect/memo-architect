// ─── Which way a connector between two ports is written ─────────────────────
//
// A connector leaves a port that sends and enters one that receives. Drawing it
// on the canvas says which two ports, not which way: the drag may start at
// either end. So the declared directions decide, and the drag only settles the
// case they leave open.

import type { MemoElement } from '@memoarchitect/tools/browser';

/**
 * The two ports of a connector in the order it is written: from the port that sends to the port that receives,
 * when their declared directions say which is which, and otherwise from the one the user started at.
 */
export function connectorEnds(a: MemoElement, b: MemoElement, startedAt: MemoElement | undefined): [MemoElement, MemoElement] {
    const direction = (port: MemoElement) => (port as { portSpec?: { direction?: string } }).portSpec?.direction;
    const sends = (port: MemoElement) => direction(port) === 'out';
    const receives = (port: MemoElement) => direction(port) === 'in';
    if (sends(a) && !sends(b) || receives(b) && !receives(a)) return [a, b];
    if (sends(b) && !sends(a) || receives(a) && !receives(b)) return [b, a];
    return startedAt?.id === b.id ? [b, a] : [a, b];
}
