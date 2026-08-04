// ─── Swimlane labels survive zoom and pan ───────────────────────────────────
//
// A lane label is drawn at the lane's leading edge. Zoom in and pan along the
// lane and that edge leaves the viewport, so the band on screen no longer says
// which swimlane it is — the diagram is still readable but the responsibility
// axis, which is the point of drawing lanes at all, is gone. The label
// therefore slides to follow the visible edge.
//
// Distances are node-coordinate pixels: the label lives inside the scaled
// viewport, so the offset scales with zoom on its own and no zoom factor is
// applied to the result here.

import { describe, it, expect } from 'vitest';
import { stickyLabelOffset } from '../ActionFlowNode';

const LANE_EXTENT = 956;
const LABEL_EXTENT = 40;
const offset = (laneStart: number, translate: number, zoom: number) =>
    stickyLabelOffset(laneStart, LANE_EXTENT, LABEL_EXTENT, translate, zoom);

describe('stickyLabelOffset', () => {
    it('leaves the label at the lane edge while that edge is on screen', () => {
        expect(offset(0, 36, 1)).toBe(0);
        expect(offset(0, 0, 1)).toBe(0);
        // Lane starting to the right of the origin, viewport unpanned.
        expect(offset(120, -60, 1)).toBe(0);
    });

    it('follows the viewport edge once the lane edge is panned off screen', () => {
        // Panned 300px right at 1× — the label moves 300 node-px along the lane.
        expect(offset(0, -300, 1)).toBe(300);
        // The measured case from the canvas: 3× zoom, translateX -1696, so the
        // lane edge sits 565 node-px to the left of the viewport.
        expect(offset(0, -1696, 3)).toBeCloseTo(565.33, 1);
    });

    it('stops at the far edge so the label never leaves the band it names', () => {
        expect(offset(0, -100_000, 1)).toBe(LANE_EXTENT - LABEL_EXTENT);
    });

    it('never moves the label backwards, past the lane start', () => {
        expect(offset(500, 0, 1)).toBe(0);
        expect(offset(500, 200, 2)).toBe(0);
    });
});
