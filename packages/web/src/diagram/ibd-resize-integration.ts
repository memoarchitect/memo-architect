import type { Node } from '@xyflow/react';
import { solveIbdResize, type ResizeDirection, type ResizeMinimums } from './ibd-resize';

export type IbdResizePhase = 'start' | 'update' | 'commit' | 'cancel';
export type IbdResizeHandler = (phase: IbdResizePhase, nodes: Node[]) => void;

/** A fresh projection of immutable gesture-start geometry, never clamped drift. */
export function resizeIbdNodes<T extends Node>(start: T[], id: string, direction: ResizeDirection,
    delta: { x: number; y: number }, minima: ResizeMinimums): T[] | null {
    const geometry = start.filter(n => n.type !== 'annotationNode').map(n => ({
        id: n.id, parentId: n.parentId, hidden: n.hidden, ...n.position,
        width: Number(n.width ?? n.measured?.width ?? n.style?.width ?? 0),
        height: Number(n.height ?? n.measured?.height ?? n.style?.height ?? 0),
    }));
    const result = solveIbdResize({ nodes: geometry, id, direction, delta, minima, clearance: 4 });
    if (!result) return null;
    const original = geometry.find(n => n.id === id)!;
    return start.map(n => {
        if (n.id !== id) return result.children[n.id] ? { ...n, position: result.children[n.id] } : n;
        const { x, y, width, height } = result.rect;
        const ports = n.data.ports as Array<{ x: number; y: number; side?: string }> | undefined;
        return { ...n, position: { x, y }, width, height, measured: { ...n.measured, width, height },
            style: { ...n.style, width, height }, data: { ...n.data, ...(ports ? { ports: ports.map(p => ({
                ...p, ...(p.side === 'right' ? { x: p.x + width - original.width } : {}),
                ...(p.side === 'bottom' ? { y: p.y + height - original.height } : {}),
            })) } : {}) } };
    });
}

/** Restore geometry only: selection, callbacks and opaque data remain current. */
export function restoreIbdGeometry<T extends Node>(current: T[], snapshot: T[], ids: Set<string>): T[] {
    const saved = new Map(snapshot.map(n => [n.id, n]));
    return current.map(n => {
        const s = saved.get(n.id);
        if (!s || !ids.has(n.id)) return n;
        // Initial ELK frames can have style/measured dimensions but no width
        // attributes. Undo must author those dimensions too, or the writer keeps
        // the last saved resized width and reload resurrects the undone gesture.
        const width = Number(s.width ?? s.style?.width ?? s.measured?.width ?? 0);
        const height = Number(s.height ?? s.style?.height ?? s.measured?.height ?? 0);
        return { ...n, position: s.position, width, height,
            measured: { ...s.measured, width, height }, style: { ...n.style, width, height },
            data: { ...n.data, ports: s.data.ports } };
    });
}
