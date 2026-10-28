import { describe, expect, it } from 'vitest';
import type { DiagramLayout } from '@memoarchitect/tools/browser';
import { withIbdRouting, mergeRenderedLayout, ibdRouting } from '../ibd-routing';
import { LayoutSaveObservation } from '../layout-save-observation';

const seed = () => ({
    future: { keep: true },
    nodes: { hidden: { x: -40, y: 20 }, shown: { x: 10, y: 20 } },
    edges: { wire: { points: [{ x: 1, y: 2 }, { x: 30, y: 40 }] } },
    canvas: { autoLayout: true, zoom: 0.75, pan: { x: -10, y: 5 },
        plugin: { nodes: { native: { x: 3, y: 4 } } }, futureCanvas: { keep: true } },
}) as DiagramLayout;

describe('layout ownership boundaries', () => {
    it('routing settings retain placement, legacy points, viewport and unknown canvas fields', () => {
        const original = seed();
        const manual = withIbdRouting(original, { mode: 'manual' });
        const typed = withIbdRouting(manual, { type: 'arc' });
        expect(typed).toEqual({ ...original, canvas: { ...original.canvas, routingMode: 'manual', routingType: 'arc' } });
        expect(ibdRouting(withIbdRouting(typed, { mode: 'automatic' }))).toEqual({ type: 'arc', mode: 'automatic' });
        expect(original.canvas?.routingMode).toBeUndefined();
    });
    it('rendered geometry does not erase hidden entries or another owner namespace', () => {
        const original = seed();
        const updated = mergeRenderedLayout(original, { nodes: { shown: { x: 50, y: 70 } },
            edges: { wire: {} }, canvas: { autoLayout: false } });
        expect(updated.nodes.hidden).toEqual(original.nodes.hidden);
        expect(updated.nodes.shown).toEqual({ x: 50, y: 70 });
        expect(updated.edges.wire.points).toBeUndefined(); // explicit automatic replacement clears bends
        expect(updated.canvas).toEqual({ ...original.canvas, autoLayout: false });
        expect((updated as any).future).toEqual({ keep: true });
        expect(ibdRouting(updated).mode).toBe('automatic');
    });
    it('sent is pending; only the current completed save can become saved', () => {
        const tracker = new LayoutSaveObservation(), a = seed();
        const initial = withIbdRouting(a, { type: 'straight' });
        expect(tracker.accept('A', initial)).toBe(true);
        const first = tracker.sent('A', a);
        const newer = withIbdRouting(a, { type: 'arc' });
        const second = tracker.sent('A', newer);
        expect(tracker.read('A')?.status).toBe('pending');
        expect(tracker.observed('A', first)).toBe(false);
        expect(tracker.accept('A', a)).toBe(false);
        expect(tracker.observed('A', second)).toBe(true);
        expect(tracker.read('A')?.status).toBe('saved');
        expect(tracker.accept('A', JSON.parse(JSON.stringify(a)))).toBe(false);
        expect(tracker.accept('A', newer)).toBe(true);
        expect(tracker.accept('A', initial)).toBe(false);
        expect(tracker.accept('B', a)).toBe(true);
    });
    it('failed saves keep the draft; retry and an unrelated remote update work after observation', () => {
        const tracker = new LayoutSaveObservation(), a = seed();
        const failed = tracker.sent('A', a);
        tracker.observed('A', failed, 'disk refused');
        expect(tracker.read('A')).toMatchObject({ status: 'failed', error: 'disk refused' });
        const remote = withIbdRouting(a, { type: 'straight' });
        expect(tracker.accept('A', remote)).toBe(false);
        const retry = tracker.sent('A', a);
        expect(tracker.observed('A', failed)).toBe(false);
        tracker.observed('A', retry);
        expect(tracker.accept('A', remote)).toBe(true);
    });
});
