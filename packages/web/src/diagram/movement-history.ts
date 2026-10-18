import type { Edge, Node } from '@xyflow/react';

const portKeys = ['x', 'y', 'side', 'size', 'alongOffset', 'faceOuter'] as const;
const edgeKeys = ['points', 'sourceOffset', 'targetOffset', 'sourceSide', 'targetSide',
    'sourceT', 'targetT', 'manualLanding', 'manualRoute', 'routingType', 'labelPoint'] as const;
type Fields = Record<string, unknown>;
interface NodeGeometry {
    id: string;
    position: { x: number; y: number };
    width?: number;
    height?: number;
    styleWidth?: number | string;
    styleHeight?: number | string;
    measured?: { width?: number; height?: number };
    ports?: Array<Fields & { id: string }>;
}
export interface MovementGeometry {
    nodes: NodeGeometry[];
    edges: Array<{ id: string; data: Fields }>;
}

function fields(value: Fields, keys: readonly string[]): Fields {
    return Object.fromEntries(keys.filter(key => value[key] !== undefined)
        .map(key => [key, structuredClone(value[key])]));
}
function restoreFields(current: Fields, saved: Fields, keys: readonly string[]): Fields {
    const result = { ...current };
    for (const key of keys) {
        delete result[key];
        if (saved[key] !== undefined) result[key] = structuredClone(saved[key]);
    }
    return result;
}

/** History contains plain geometry, not renderer instances, callbacks or selection. */
export function captureMovementGeometry(nodes: Node[], edges: Edge[]): MovementGeometry {
    return {
        nodes: nodes.map(node => ({
            id: node.id, position: { ...node.position }, width: node.width, height: node.height,
            styleWidth: node.style?.width, styleHeight: node.style?.height,
            measured: node.measured && { ...node.measured },
            ports: (node.data.ports as Array<Fields & { id: string }> | undefined)
                ?.map(port => ({ id: port.id, ...fields(port, portKeys) })),
        })),
        edges: edges.map(edge => ({ id: edge.id, data: fields(edge.data ?? {}, edgeKeys) })),
    };
}

export function movementGeometryChanges(before: MovementGeometry, after: MovementGeometry) {
    const changed = <T extends { id: string }>(a: T[], b: T[]) => {
        const old = new Map(a.map(value => [value.id, value]));
        return new Set(b.filter(value => JSON.stringify(value) !== JSON.stringify(old.get(value.id)))
            .map(value => value.id));
    };
    return { nodes: changed(before.nodes, after.nodes), edges: changed(before.edges, after.edges) };
}

/** Exact replay: preserve current interaction/semantic data; do not snap or re-route. */
export function restoreMovementGeometry<N extends Node, E extends Edge>(
    nodes: N[], edges: E[], snapshot: MovementGeometry,
    changed: { nodes: Set<string>; edges: Set<string> },
): { nodes: N[]; edges: E[] } {
    const savedNodes = new Map(snapshot.nodes.map(node => [node.id, node]));
    const savedEdges = new Map(snapshot.edges.map(edge => [edge.id, edge]));
    return {
        nodes: nodes.map(node => {
            const saved = savedNodes.get(node.id);
            if (!saved || !changed.nodes.has(node.id)) return node;
            const savedPorts = new Map(saved.ports?.map(port => [port.id, port]));
            const ports = node.data.ports as Array<Fields & { id: string }> | undefined;
            return { ...node, position: { ...saved.position }, width: saved.width, height: saved.height,
                measured: saved.measured && { ...saved.measured },
                style: { ...node.style, width: saved.styleWidth, height: saved.styleHeight },
                data: { ...node.data, ...(ports ? { ports: ports.map(port => {
                    const geometry = savedPorts.get(port.id);
                    return geometry ? restoreFields(port, geometry, portKeys) : port;
                }) } : {}) },
            };
        }),
        edges: edges.map(edge => {
            const saved = savedEdges.get(edge.id);
            return saved && changed.edges.has(edge.id)
                ? { ...edge, data: restoreFields(edge.data ?? {}, saved.data, edgeKeys) }
                : edge;
        }),
    };
}
