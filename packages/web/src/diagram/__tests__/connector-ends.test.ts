// ─── A connector is written from the port that sends to the one that receives ─

import { describe, expect, it } from 'vitest';
import type { MemoElement } from '@memoarchitect/tools/browser';
import { connectorEnds } from '../connector-ends';

const port = (id: string, direction?: 'in' | 'out' | 'inout'): MemoElement => ({
    id, name: id, kind: 'DataPort', construct: 'port', layer: 'logical', file: 'test.sysml', attributes: {},
    portSpec: { type: 'DataPort', isConjugated: false, ...(direction ? { direction } : {}) },
} as unknown as MemoElement);

const ids = (ends: [MemoElement, MemoElement]) => ends.map(end => end.id);

describe('the ends of a connector', () => {
    it('runs from an out port to an in port, whichever one the drag started at', () => {
        const sender = port('sender', 'out'), receiver = port('receiver', 'in');
        expect(ids(connectorEnds(receiver, sender, receiver))).toEqual(['sender', 'receiver']);
        expect(ids(connectorEnds(sender, receiver, receiver))).toEqual(['sender', 'receiver']);
    });

    it('lets one declared direction decide when the other port declares none', () => {
        const sender = port('sender', 'out'), open = port('open');
        expect(ids(connectorEnds(open, sender, open))).toEqual(['sender', 'open']);
        const receiver = port('receiver', 'in');
        expect(ids(connectorEnds(receiver, open, receiver))).toEqual(['open', 'receiver']);
    });

    it('follows the drag when the directions do not say', () => {
        const a = port('a'), b = port('b', 'inout');
        expect(ids(connectorEnds(a, b, b))).toEqual(['b', 'a']);
        expect(ids(connectorEnds(a, b, a))).toEqual(['a', 'b']);
        const out1 = port('out1', 'out'), out2 = port('out2', 'out');
        expect(ids(connectorEnds(out1, out2, out2))).toEqual(['out2', 'out1']);
    });
});
