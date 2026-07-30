// ─── Arrange: align, size and distribute a selection ─────────────────────────
//
// The geometry behind the selection toolbar, kept pure so the rules are testable
// without a canvas: what "align left" means when a selection spans nested parts,
// which box the others follow, and how distribute divides the gap.
//
// Every operation returns only the boxes it actually changed. That keeps the
// caller's write to the layout companion minimal, and means a no-op arrange
// leaves no diff behind.
// ─────────────────────────────────────────────────────────────────────────────

export interface ArrangeBox {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export type AlignEdge = 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY';
export type SizeMatch = 'width' | 'height' | 'both';
export type DistributeAxis = 'horizontal' | 'vertical';

/** Changed geometry, keyed by node id. */
export type ArrangeResult = Map<string, Partial<Omit<ArrangeBox, 'id'>>>;

/**
 * The box the others follow.
 *
 * Miro and every desktop tool anchor an align on one member rather than on the
 * selection's midpoint, because an align the user repeats must be idempotent —
 * anchoring on the average would drift the whole group each time. The outermost
 * box in the direction of travel is that anchor, and for a centre align it is
 * the widest (or tallest), whose own centre therefore does not move.
 */
export function alignAnchor(boxes: readonly ArrangeBox[], edge: AlignEdge): ArrangeBox | undefined {
    if (boxes.length === 0) return undefined;
    const pick = (better: (a: ArrangeBox, b: ArrangeBox) => boolean) =>
        boxes.reduce((best, box) => better(box, best) ? box : best);
    switch (edge) {
        case 'left': return pick((a, b) => a.x < b.x);
        case 'right': return pick((a, b) => a.x + a.width > b.x + b.width);
        case 'top': return pick((a, b) => a.y < b.y);
        case 'bottom': return pick((a, b) => a.y + a.height > b.y + b.height);
        case 'centerX': return pick((a, b) => a.width > b.width);
        case 'centerY': return pick((a, b) => a.height > b.height);
    }
}

/** Move every box onto the anchor's edge (or centreline). */
export function alignBoxes(boxes: readonly ArrangeBox[], edge: AlignEdge): ArrangeResult {
    const changed: ArrangeResult = new Map();
    const anchor = alignAnchor(boxes, edge);
    if (!anchor || boxes.length < 2) return changed;

    for (const box of boxes) {
        let next: number;
        switch (edge) {
            case 'left': next = anchor.x; break;
            case 'right': next = anchor.x + anchor.width - box.width; break;
            case 'centerX': next = anchor.x + anchor.width / 2 - box.width / 2; break;
            case 'top': next = anchor.y; break;
            case 'bottom': next = anchor.y + anchor.height - box.height; break;
            case 'centerY': next = anchor.y + anchor.height / 2 - box.height / 2; break;
        }
        const horizontal = edge === 'left' || edge === 'right' || edge === 'centerX';
        const current = horizontal ? box.x : box.y;
        if (Math.abs(current - next) < 0.5) continue;
        changed.set(box.id, horizontal ? { x: next } : { y: next });
    }
    return changed;
}

/**
 * Give every box the largest box's width, height, or both.
 *
 * Largest rather than first-selected: a selection has no order the user can see,
 * so "same size" has to mean something they can predict from the canvas. Growing
 * to the largest also never crops content, which shrinking to the smallest would.
 */
export function matchSize(boxes: readonly ArrangeBox[], match: SizeMatch): ArrangeResult {
    const changed: ArrangeResult = new Map();
    if (boxes.length < 2) return changed;
    const width = Math.max(...boxes.map(box => box.width));
    const height = Math.max(...boxes.map(box => box.height));

    for (const box of boxes) {
        const next: Partial<ArrangeBox> = {};
        if (match !== 'height' && Math.abs(box.width - width) >= 0.5) next.width = width;
        if (match !== 'width' && Math.abs(box.height - height) >= 0.5) next.height = height;
        if (Object.keys(next).length > 0) changed.set(box.id, next);
    }
    return changed;
}

/**
 * Even the gaps between boxes along one axis.
 *
 * The two outermost boxes hold still and define the span; the rest are dealt out
 * so the *gaps* are equal, not the centres — equal centres would bunch a wide box
 * against its neighbours. Needs three boxes to mean anything: with two, the gap
 * is already the only gap.
 */
export function distributeBoxes(boxes: readonly ArrangeBox[], axis: DistributeAxis): ArrangeResult {
    const changed: ArrangeResult = new Map();
    if (boxes.length < 3) return changed;
    const horizontal = axis === 'horizontal';
    const start = (box: ArrangeBox) => horizontal ? box.x : box.y;
    const size = (box: ArrangeBox) => horizontal ? box.width : box.height;

    const ordered = [...boxes].sort((a, b) => start(a) - start(b));
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    const span = (start(last) + size(last)) - start(first);
    const occupied = ordered.reduce((total, box) => total + size(box), 0);
    // A selection packed tighter than its own contents has no slack to share;
    // forcing a negative gap would stack the middle boxes on each other.
    const gap = (span - occupied) / (ordered.length - 1);
    if (!Number.isFinite(gap) || gap < 0) return changed;

    let cursor = start(first) + size(first) + gap;
    for (const box of ordered.slice(1, -1)) {
        if (Math.abs(start(box) - cursor) >= 0.5) {
            changed.set(box.id, horizontal ? { x: cursor } : { y: cursor });
        }
        cursor += size(box) + gap;
    }
    return changed;
}
