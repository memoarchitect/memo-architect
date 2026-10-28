export interface Box { x: number; y: number; width: number; height: number }

/**
 * The position nearest `drop` where `size` overlaps none of `others` (with
 * `gap` between them) and stays inside `bounds`, if there are bounds. A part
 * dropped on a sibling lands beside it rather than snapping back to where the
 * drag began. Null when no candidate fits.
 */
export function nearestFreePosition(drop: { x: number; y: number }, size: { width: number; height: number },
    others: Box[], gap: number, bounds?: Box): { x: number; y: number } | null {
    const clashes = (x: number, y: number) => others.some(o => x < o.x + o.width + gap && x + size.width + gap > o.x
        && y < o.y + o.height + gap && y + size.height + gap > o.y);
    const inside = (x: number, y: number) => !bounds || (x >= bounds.x - 1e-6 && y >= bounds.y - 1e-6
        && x + size.width <= bounds.x + bounds.width + 1e-6 && y + size.height <= bounds.y + bounds.height + 1e-6);
    // Free positions sit flush against some sibling's side, so try those lines
    // on each axis, combined with the drop point's own coordinates.
    const xs = [drop.x, ...others.flatMap(o => [o.x - size.width - gap, o.x + o.width + gap])];
    const ys = [drop.y, ...others.flatMap(o => [o.y - size.height - gap, o.y + o.height + gap])];
    if (bounds) { xs.push(bounds.x, bounds.x + bounds.width - size.width); ys.push(bounds.y, bounds.y + bounds.height - size.height); }
    let best: { x: number; y: number } | null = null, bestDistance = Infinity;
    for (const x of xs) for (const y of ys) {
        if (!inside(x, y) || clashes(x, y)) continue;
        const distance = Math.hypot(x - drop.x, y - drop.y);
        if (distance < bestDistance) { best = { x, y }; bestDistance = distance; }
    }
    return best;
}
