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
