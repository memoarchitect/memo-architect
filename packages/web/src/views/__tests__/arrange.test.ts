// ─── Arrange geometry tests ──────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
    alignAnchor, alignBoxes, matchSize, distributeBoxes, type ArrangeBox,
} from '../arrange';

const box = (id: string, x: number, y: number, width = 100, height = 50): ArrangeBox =>
    ({ id, x, y, width, height });

describe('alignAnchor', () => {
    const boxes = [box('a', 10, 40, 100, 50), box('b', 30, 10, 200, 90)];

    it('anchors an edge align on the outermost box in that direction', () => {
        expect(alignAnchor(boxes, 'left')!.id).toBe('a');
        expect(alignAnchor(boxes, 'top')!.id).toBe('b');
        // b spans to 230, a only to 110
        expect(alignAnchor(boxes, 'right')!.id).toBe('b');
        // a ends at 90, b at 100
        expect(alignAnchor(boxes, 'bottom')!.id).toBe('b');
    });

    it('anchors a centre align on the largest box, whose centre must not move', () => {
        expect(alignAnchor(boxes, 'centerX')!.id).toBe('b');
        expect(alignAnchor(boxes, 'centerY')!.id).toBe('b');
    });

    it('has no anchor for an empty selection', () => {
        expect(alignAnchor([], 'left')).toBeUndefined();
    });
});

describe('alignBoxes', () => {
    it('aligns left onto the leftmost edge', () => {
        const result = alignBoxes([box('a', 10, 0), box('b', 50, 0), box('c', 90, 0)], 'left');
        expect(result.get('b')).toEqual({ x: 10 });
        expect(result.get('c')).toEqual({ x: 10 });
        // Already on the anchor edge — nothing to change.
        expect(result.has('a')).toBe(false);
    });

    it('aligns right by the boxes own trailing edges, not their origins', () => {
        const result = alignBoxes([box('a', 0, 0, 100), box('b', 0, 0, 40)], 'right');
        // a spans to 100, so b's right edge must land there: 100 - 40
        expect(result.get('b')).toEqual({ x: 60 });
    });

    it('aligns top and bottom on the vertical axis only', () => {
        expect(alignBoxes([box('a', 0, 5), box('b', 0, 60)], 'top').get('b')).toEqual({ y: 5 });
        const bottom = alignBoxes([box('a', 0, 0, 100, 80), box('b', 0, 0, 100, 20)], 'bottom');
        expect(bottom.get('b')).toEqual({ y: 60 });
    });

    it('centres on the largest box centreline', () => {
        // b is widest: centre 0 + 200/2 = 100. a (width 100) lands at 50.
        const result = alignBoxes([box('a', 500, 0, 100), box('b', 0, 0, 200)], 'centerX');
        expect(result.get('a')).toEqual({ x: 50 });
        expect(result.has('b')).toBe(false);
    });

    it('is idempotent — repeating an align changes nothing further', () => {
        const boxes = [box('a', 10, 0), box('b', 50, 0)];
        const once = alignBoxes(boxes, 'left');
        const applied = boxes.map(b => ({ ...b, ...(once.get(b.id) ?? {}) }));
        expect(alignBoxes(applied, 'left').size).toBe(0);
    });

    it('does nothing for a selection of one', () => {
        expect(alignBoxes([box('a', 10, 0)], 'left').size).toBe(0);
    });
});

describe('matchSize', () => {
    const boxes = [box('a', 0, 0, 100, 50), box('b', 0, 0, 180, 20)];

    it('grows every box to the largest width', () => {
        const result = matchSize(boxes, 'width');
        expect(result.get('a')).toEqual({ width: 180 });
        expect(result.has('b')).toBe(false);
    });

    it('grows every box to the largest height', () => {
        expect(matchSize(boxes, 'height').get('b')).toEqual({ height: 50 });
    });

    it('matches both dimensions at once, reporting only what each box changes', () => {
        // a is 100x50 and already the tallest; b is 180x20 and already the widest.
        expect(matchSize(boxes, 'both').get('a')).toEqual({ width: 180 });
        expect(matchSize(boxes, 'both').get('b')).toEqual({ height: 50 });
    });

    it('matches both dimensions on a box that is largest in neither', () => {
        const result = matchSize([...boxes, box('c', 0, 0, 30, 10)], 'both');
        expect(result.get('c')).toEqual({ width: 180, height: 50 });
    });

    it('never shrinks, so content cannot be cropped', () => {
        const result = matchSize(boxes, 'both');
        for (const [id, next] of result) {
            const original = boxes.find(b => b.id === id)!;
            if (next.width !== undefined) expect(next.width).toBeGreaterThanOrEqual(original.width);
            if (next.height !== undefined) expect(next.height).toBeGreaterThanOrEqual(original.height);
        }
    });

    it('does nothing for a selection of one', () => {
        expect(matchSize([box('a', 0, 0)], 'both').size).toBe(0);
    });
});

describe('distributeBoxes', () => {
    it('equalises the gaps, holding the outermost boxes still', () => {
        // Span 0..400 with three 100-wide boxes: 400 - 300 = 100 slack over 2 gaps.
        const result = distributeBoxes(
            [box('a', 0, 0, 100), box('b', 120, 0, 100), box('c', 300, 0, 100)],
            'horizontal',
        );
        expect(result.get('b')).toEqual({ x: 150 });
        expect(result.has('a')).toBe(false);
        expect(result.has('c')).toBe(false);
    });

    it('equalises gaps rather than centres, so a wide box keeps its clearance', () => {
        const result = distributeBoxes(
            [box('a', 0, 0, 20), box('b', 100, 0, 200), box('c', 400, 0, 20)],
            'horizontal',
        );
        // slack = 420 - 240 = 180 over 2 gaps = 90 each; b starts at 20 + 90.
        expect(result.get('b')).toEqual({ x: 110 });
    });

    it('distributes vertically on the y axis', () => {
        const result = distributeBoxes(
            [box('a', 0, 0, 100, 40), box('b', 0, 50, 100, 40), box('c', 0, 200, 100, 40)],
            'vertical',
        );
        // span 240, occupied 120, slack 120 over 2 gaps = 60; b at 40 + 60.
        expect(result.get('b')).toEqual({ y: 100 });
    });

    it('needs three boxes to mean anything', () => {
        expect(distributeBoxes([box('a', 0, 0), box('b', 200, 0)], 'horizontal').size).toBe(0);
    });

    it('refuses a selection with no slack rather than stacking the middle boxes', () => {
        // Three 100-wide boxes inside a 150 span: overlapping already.
        const result = distributeBoxes(
            [box('a', 0, 0, 100), box('b', 20, 0, 100), box('c', 50, 0, 100)],
            'horizontal',
        );
        expect(result.size).toBe(0);
    });

    it('is idempotent — repeating a distribute changes nothing further', () => {
        const boxes = [box('a', 0, 0, 100), box('b', 120, 0, 100), box('c', 300, 0, 100)];
        const once = distributeBoxes(boxes, 'horizontal');
        const applied = boxes.map(b => ({ ...b, ...(once.get(b.id) ?? {}) }));
        expect(distributeBoxes(applied, 'horizontal').size).toBe(0);
    });
});
