import { describe, expect, it } from 'vitest';
import {
    CONTEXT_CHILD_COORDINATES, hasContextChildCoordinates,
    rebaseForFrameChange, rebaseLegacyContextChildPosition, withContextChildCoordinates,
} from '../layout-coordinate-migration';

describe('context sidecar coordinate migration', () => {
    it('marks new layouts as parent-relative without discarding existing canvas state', () => {
        const layout = withContextChildCoordinates({
            nodes: {}, edges: {}, canvas: { autoLayout: false, zoom: 0.8 },
        } as any);
        expect(layout.canvas).toMatchObject({
            autoLayout: false, zoom: 0.8, coordinateSpace: CONTEXT_CHILD_COORDINATES,
        });
        expect(hasContextChildCoordinates(layout)).toBe(true);
    });

    it('rebases old absolute context-system positions against their boundary', () => {
        expect(rebaseLegacyContextChildPosition({ x: 420, y: 160 }, { x: 328, y: 86 }))
            .toEqual({ x: 92, y: 74 });
    });
});

describe('rebaseForFrameChange', () => {
    // A tiny board: `boundary` sits at (100, 50); everything else is measured
    // either from the board origin or from inside it.
    const positionOf = (id: string) =>
        ({ boundary: { x: 100, y: 50 }, other: { x: 300, y: 200 } } as Record<string, { x: number; y: number }>)[id];

    it('leaves a position alone when the frame has not changed', () => {
        expect(rebaseForFrameChange({ x: 40, y: 20, parent: 'boundary' }, 'boundary', positionOf))
            .toEqual({ x: 40, y: 20 });
        expect(rebaseForFrameChange({ x: 40, y: 20, parent: null }, null, positionOf))
            .toEqual({ x: 40, y: 20 });
    });

    it('subtracts the new parent when a board node becomes nested', () => {
        // Saved at board (140, 70); the boundary it now sits in is at (100, 50),
        // so locally it is (40, 20) — the same place on screen.
        expect(rebaseForFrameChange({ x: 140, y: 70, parent: null }, 'boundary', positionOf))
            .toEqual({ x: 40, y: 20 });
    });

    it('adds the old parent when a nested node moves to the board', () => {
        expect(rebaseForFrameChange({ x: 40, y: 20, parent: 'boundary' }, null, positionOf))
            .toEqual({ x: 140, y: 70 });
    });

    it('re-bases through both frames when the parent changes', () => {
        // (40,20) in boundary = board (140,70) = (-160,-130) inside `other`.
        expect(rebaseForFrameChange({ x: 40, y: 20, parent: 'boundary' }, 'other', positionOf))
            .toEqual({ x: -160, y: -130 });
    });

    it('leaves a v1 entry alone, because its frame was never recorded', () => {
        // Guessing the frame is what corrupted layouts before v2. An unchanged
        // position may be wrong, but it is wrong visibly and only once.
        expect(rebaseForFrameChange({ x: 140, y: 70 }, 'boundary', positionOf))
            .toEqual({ x: 140, y: 70 });
    });

    it('falls back to the saved position when a recorded parent is gone', () => {
        expect(rebaseForFrameChange({ x: 40, y: 20, parent: 'deleted' }, null, positionOf))
            .toEqual({ x: 40, y: 20 });
    });
});
