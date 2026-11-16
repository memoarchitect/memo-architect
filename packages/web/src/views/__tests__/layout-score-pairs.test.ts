// ─── A pair of boxes is scored once, for every connector it carries ─────────
//
// An arrangement is scored from the paths the router can realise between its
// boxes. Every connector between the same two boxes has the same path there, so
// the pair is routed once and weighted. These tests hold the score to that:
// more connectors on a pair cost more, in proportion, and scoring a pair that
// carries hundreds stays quick.

import { describe, expect, it } from 'vitest';
import { resolvedLayoutScore, type ResolvedGraphLayout, type ResolverEdge } from '../layout';

const board: ResolvedGraphLayout = {
    strategy: 'layered-right', width: 700, height: 420,
    children: [
        { id: 'sender', x: 0, y: 0, width: 200, height: 120 },
        { id: 'receiver', x: 500, y: 300, width: 200, height: 120 },
    ],
};

const links = (count: number): ResolverEdge[] =>
    Array.from({ length: count }, (_, i) => ({ id: `link-${i}`, source: 'sender', target: 'receiver' }));

describe('scoring an arrangement', () => {
    it('weights a pair of boxes by the connectors it carries', () => {
        const empty = resolvedLayoutScore(board, []);
        const one = resolvedLayoutScore(board, links(1)) - empty;
        const three = resolvedLayoutScore(board, links(3)) - empty;
        expect(one).toBeGreaterThan(0);
        expect(three).toBeCloseTo(one * 3, 6);
    });

    it('scores a pair carrying hundreds of connectors without routing each one', () => {
        const started = performance.now();
        resolvedLayoutScore(board, links(300));
        expect(performance.now() - started).toBeLessThan(500);
    });
});
