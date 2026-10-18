import type { DiagramLayout } from '@memoarchitect/tools/browser';
import { rebaseForFrameChange } from '../../layout-coordinate-migration';
import type { ComparisonScene } from '../../diagram-renderer-selection';
import { ibdRouting, mergeNativeEntries, withIbdRouting, type IbdRoutingType, type IbdRoutingMode, type RoutePoint, type RouteSide } from '../../ibd-routing';

export type X6Native = NonNullable<NonNullable<DiagramLayout['canvas']>['x6']>;
export type X6Terminal = { cell: string; port?: string };
export interface X6Snapshot {
    nodes: X6Native['nodes'];
    ports: NonNullable<X6Native['ports']>;
    edges: NonNullable<X6Native['edges']>;
    attachments: Record<string, { source: X6Terminal; target: X6Terminal }>;
    routing: { type: IbdRoutingType; mode: IbdRoutingMode };
    autoLayout: boolean;
}
export const X6_ROUTING: Record<IbdRoutingType, { router: string; connector: string; description: string }> = {
    manhattan: { router: 'memo-ibd-manhattan', connector: 'normal', description: 'X6 Manhattan obstacle router' },
    orthogonal: { router: 'orth', connector: 'normal', description: 'X6 orthogonal router' },
    straight: { router: 'normal', connector: 'normal', description: 'X6 straight chord / manual polyline' },
    elbow: { router: 'orth', connector: 'normal', description: 'X6 orthogonal approximation; no distinct elbow algorithm' },
    rounded: { router: 'orth', connector: 'rounded', description: 'X6 orthogonal router with rounded joins' },
    curved: { router: 'orth', connector: 'smooth', description: 'X6 smooth interpolation' },
    arc: { router: 'orth', connector: 'smooth', description: 'X6 smooth approximation; no quadratic arc algorithm' },
};
export function x6Route(type: IbdRoutingType, mode: IbdRoutingMode) {
    return { ...X6_ROUTING[type], router: mode === 'manual' ? 'normal' : X6_ROUTING[type].router };
}

/** Shared parent-local frames are imported once; native frames are absolute.
 * Native overrides never become shared edits implicitly. */
export function x6InitialFrames(scene: ComparisonScene, layout?: DiagramLayout): X6Native['nodes'] {
    const frames: X6Native['nodes'] = {};
    const pending = new Map(scene.nodes.map(node => [node.id, node]));
    while (pending.size) {
        let progress = false;
        for (const [id, node] of pending) {
            if (node.parentId && !frames[node.parentId]) continue;
            const parent = node.parentId ? frames[node.parentId] : undefined;
            const shared = layout?.nodes[id];
            const native = layout?.canvas?.x6?.nodes[id];
            const position = shared ? rebaseForFrameChange(shared, node.parentId ?? null, parentId =>
                frames[parentId] ?? layout?.canvas?.x6?.nodes[parentId] ?? layout?.nodes[parentId]) : node.position;
            frames[id] = { x: native?.x ?? (parent?.x ?? 0) + position.x,
                y: native?.y ?? (parent?.y ?? 0) + position.y,
                width: native?.width ?? shared?.width ?? Number(node.width ?? node.style?.width ?? 180),
                height: native?.height ?? shared?.height ?? Number(node.height ?? node.style?.height ?? 100) };
            pending.delete(id); progress = true;
        }
        if (!progress) throw new Error('X6 placement has a missing or cyclic parent');
    }
    return frames;
}
export function x6PortCenter(slot: { x: number; y: number }, size: number): RoutePoint {
    return { x: slot.x + size / 2, y: slot.y + size / 2 };
}
export function x6PortSlot(center: RoutePoint, size: number, side: RouteSide) {
    return { x: center.x - size / 2, y: center.y - size / 2, side };
}
/** Endpoint identifiers are an explicit mapping. Inner-handle identity is kept
 * in the original shared scene; X6 has one physical port per boundary. */
export function x6Terminal(cell: string, handle?: string | null): X6Terminal {
    return { cell, ...(handle ? { port: handle.replace(/__inner$/, '') } : {}) };
}
export function x6Interiors(id: string, layout?: DiagramLayout): RoutePoint[] {
    return (layout?.canvas?.x6?.edges?.[id] ?? layout?.edges[id]?.points?.slice(1, -1) ?? []).map(p => ({ ...p }));
}
export function saveX6Snapshot(previous: DiagramLayout, snapshot: X6Snapshot, geometry: boolean): DiagramLayout {
    const updated = withIbdRouting(previous, snapshot.routing);
    if (!geometry) return updated;
    const existing = previous.canvas?.x6;
    const native = { ...existing, nodes: mergeNativeEntries(existing?.nodes, snapshot.nodes),
        edges: mergeNativeEntries(existing?.edges, snapshot.edges),
        ports: { ...existing?.ports, ...Object.fromEntries(Object.entries(snapshot.ports).map(([id, ports]) =>
            [id, mergeNativeEntries(existing?.ports?.[id], ports)])) },
        attachments: mergeNativeEntries((existing as X6Native & { attachments?: X6Snapshot['attachments'] })?.attachments, snapshot.attachments),
    };
    return { ...updated, canvas: { ...updated.canvas, autoLayout: snapshot.autoLayout, x6: native } };
}

/** Plain snapshot history survives renderer unmount, scoped to model+diagram.
 * It never retains a graph, native object, callback, selection or tools. */
export class X6History {
    undo: Array<{ before: X6Snapshot; after: X6Snapshot; geometry: boolean }> = [];
    redo: X6History['undo'] = [];
    push(before: X6Snapshot, after: X6Snapshot, geometry: boolean): boolean {
        if (JSON.stringify(before) === JSON.stringify(after)) return false;
        this.undo.push(JSON.parse(JSON.stringify({ before, after, geometry })));
        this.undo = this.undo.slice(-100); this.redo = []; return true;
    }
    step(direction: 'undo' | 'redo') {
        const entry = this[direction].pop();
        if (!entry) return undefined;
        this[direction === 'undo' ? 'redo' : 'undo'].push(entry);
        return { snapshot: JSON.parse(JSON.stringify(direction === 'undo' ? entry.before : entry.after)) as X6Snapshot, geometry: entry.geometry };
    }
}
const histories = new WeakMap<object, Map<string, X6History>>();
export function x6History(model: object, diagramId: string): X6History {
    let diagrams = histories.get(model);
    if (!diagrams) { diagrams = new Map(); histories.set(model, diagrams); }
    let history = diagrams.get(diagramId);
    if (!history) { history = new X6History(); diagrams.set(diagramId, history); }
    return history;
}
export { ibdRouting };
