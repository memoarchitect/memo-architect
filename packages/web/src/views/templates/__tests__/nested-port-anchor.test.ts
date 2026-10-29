// A connector that ends on a port carrying nested pins — rather than on one of its pins — has to meet the body that
// port is drawn as. These pin that meeting point down for each face and wall, and keep a plain port where it was.

import { describe, it, expect } from 'vitest';
import {
    portAnchorOffset, INTERCONNECTION_PORT_SIZE, NESTED_PITCH, NESTED_PIN_INSET, NESTED_HOUSING_DEPTH,
} from '../interconnection-view';

const SIZE = INTERCONNECTION_PORT_SIZE;
const bodyLength = (count: number) => (count - 1) * NESTED_PITCH + SIZE + NESTED_PIN_INSET * 2;

describe('where a connector meets a port', () => {
    it('meets the middle of a plain port\'s face', () => {
        const port = { x: -16, y: 100, side: 'left' as const };
        expect(portAnchorOffset(port, 'left')).toEqual({ x: -16, y: 100 + SIZE / 2 });
        expect(portAnchorOffset(port, 'right')).toEqual({ x: -16 + SIZE, y: 100 + SIZE / 2 });
        expect(portAnchorOffset(port, 'top')).toEqual({ x: -16 + SIZE / 2, y: 100 });
    });

    it('honours a forced port size', () => {
        expect(portAnchorOffset({ x: 0, y: 0, side: 'left' }, 'right', 20)).toEqual({ x: 20, y: 10 });
    });

    it('meets the middle of a nested-pin port\'s body on a vertical wall', () => {
        const port = { x: -16, y: 60, side: 'left' as const, nestedCount: 4 };
        const along = 60 + bodyLength(4) / 2;
        expect(portAnchorOffset(port, 'left')).toEqual({ x: -16, y: along });
        expect(portAnchorOffset(port, 'right')).toEqual({ x: -16 + NESTED_HOUSING_DEPTH, y: along });
    });

    it('meets the middle of a nested-pin port\'s body on a horizontal wall', () => {
        const port = { x: 200, y: 400, side: 'bottom' as const, nestedCount: 2 };
        const along = 200 + bodyLength(2) / 2;
        expect(portAnchorOffset(port, 'top')).toEqual({ x: along, y: 400 });
        expect(portAnchorOffset(port, 'bottom')).toEqual({ x: along, y: 400 + NESTED_HOUSING_DEPTH });
    });

    it('treats a port with one pin as a body one pin long', () => {
        const port = { x: 0, y: 0, side: 'right' as const, nestedCount: 1 };
        expect(portAnchorOffset(port, 'right').y).toBe(bodyLength(1) / 2);
    });
});
