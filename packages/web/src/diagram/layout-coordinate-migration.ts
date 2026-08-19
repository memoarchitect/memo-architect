import type { DiagramLayout } from '@memoarchitect/tools/browser';

/**
 * React Flow stores a child node in its parent's coordinate system. Context
 * diagrams before this marker stored the system-of-interest in board
 * coordinates, because it was only painted over the boundary rather than
 * nested in it. Keep the marker in the sidecar so old boards can be rebased
 * once while new boards remain unambiguous.
 */
export const CONTEXT_CHILD_COORDINATES = 'context-child-v1';

type CoordinateAwareCanvas = NonNullable<DiagramLayout['canvas']> & {
    coordinateSpace?: string;
};

export function hasContextChildCoordinates(layout?: DiagramLayout): boolean {
    return (layout?.canvas as CoordinateAwareCanvas | undefined)?.coordinateSpace === CONTEXT_CHILD_COORDINATES;
}

export function withContextChildCoordinates<T extends DiagramLayout>(layout: T): T {
    return {
        ...layout,
        canvas: {
            ...layout.canvas,
            coordinateSpace: CONTEXT_CHILD_COORDINATES,
        },
    } as T;
}

/** Convert an old board-space saved position to its new parent-relative one. */
export function rebaseLegacyContextChildPosition(
    position: { x: number; y: number },
    parentPosition: { x: number; y: number },
): { x: number; y: number } {
    return { x: position.x - parentPosition.x, y: position.y - parentPosition.y };
}

/**
 * Convert a saved position into the node's CURRENT coordinate frame.
 *
 * React Flow positions a nested node relative to its parent and a top-level node
 * in board coordinates. Nesting is a MODEL fact and layout is presentation, so a
 * node can change frame without anyone touching the diagram — and then the saved
 * numbers, which meant one thing, are read as another and the node jumps. That
 * is the whole "nesting a previously-flat node corrupts saved layouts" problem:
 * not a layout bug, a missing statement of which frame the layout was in.
 *
 * `parent` on the saved entry records that frame (layout v2):
 *
 *   * unchanged           → use as-is
 *   * board → nested      → subtract the new parent's position
 *   * nested → board      → add the old parent's position
 *   * nested → different  → both
 *   * not recorded (v1)   → leave alone. The frame is unknown, and guessing it
 *                           is what produced the corruption in the first place.
 */
export function rebaseForFrameChange(
    saved: { x: number; y: number; parent?: string | null },
    currentParentId: string | null,
    positionOf: (id: string) => { x: number; y: number } | undefined,
): { x: number; y: number } {
    const here = { x: saved.x, y: saved.y };
    if (saved.parent === undefined) return here;
    const savedParentId = saved.parent ?? null;
    if (savedParentId === currentParentId) return here;

    let absolute = here;
    if (savedParentId) {
        const old = positionOf(savedParentId);
        if (old) absolute = { x: here.x + old.x, y: here.y + old.y };
    }
    if (!currentParentId) return absolute;
    const next = positionOf(currentParentId);
    return next ? { x: absolute.x - next.x, y: absolute.y - next.y } : absolute;
}
