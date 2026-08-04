import { describe, expect, it } from 'vitest';
import {
    CONTEXT_CHILD_COORDINATES, hasContextChildCoordinates,
    rebaseLegacyContextChildPosition, withContextChildCoordinates,
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
