// ─── ReactFlow-shaped layout output → vendor-neutral scene spec ──────────────
//
// The template layout pipeline (views/templates/*, views/layout.ts) emits
// ReactFlow-shaped nodes/edges. This adapter flattens that output into plain
// cell specs a retained-mode engine (maxGraph) can draw, without importing
// anything from either rendering engine — so it stays unit-testable in Node.
// ─────────────────────────────────────────────────────────────────────────────

interface FlowishNode {
    id: string;
    type?: string;
    position: { x: number; y: number };
    parentId?: string;
    width?: number;
    height?: number;
    style?: Record<string, unknown>;
    data?: Record<string, unknown>;
}

interface FlowishEdge {
    id: string;
    source: string;
    target: string;
    label?: unknown;
    animated?: boolean;
    style?: Record<string, unknown>;
    data?: Record<string, unknown>;
}

export interface SceneNodeSpec {
    id: string;
    parentId?: string;
    /** Position relative to parent (ReactFlow convention, matches maxGraph nesting). */
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    kind: string;
    /** Fill color derived from layer/override; frames render outline-only. */
    color: string;
    isFrame: boolean;
    /** Derived swimlane/frame members, retained so saved node moves can resize the frame. */
    memberIds?: string[];
    orientation?: 'row' | 'column';
}

export interface SceneEdgeSpec {
    id: string;
    sourceId: string;
    targetId: string;
    label?: string;
    color: string;
    strokeWidth: number;
    dashed: boolean;
    animated: boolean;
    /** Interior waypoints in absolute coordinates (terminal points excluded). */
    points: Array<{ x: number; y: number }>;
}

export interface DiagramSceneSpec {
    nodes: SceneNodeSpec[];
    edges: SceneEdgeSpec[];
}

const MIN_WIDTH = 130;
const MIN_HEIGHT = 52;

function toNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
}

/** Same estimate the standard layout feeds ELK, for nodes that size via CSS. */
function estimateSize(label: string, kind: string): { width: number; height: number } {
    return {
        width: Math.max(label.length * 7.5 + 48, kind.length * 6.8 + 48, MIN_WIDTH),
        height: MIN_HEIGHT,
    };
}

function nodeSize(node: FlowishNode, label: string, kind: string): { width: number; height: number } {
    const width = toNumber(node.width) ?? toNumber(node.style?.width);
    const height = toNumber(node.height) ?? toNumber(node.style?.height);
    if (width !== undefined && height !== undefined) return { width, height };
    const estimated = estimateSize(label, kind);
    return { width: width ?? estimated.width, height: height ?? estimated.height };
}

/** Parents must be emitted before children so nesting can resolve on insert. */
function parentFirst(nodes: readonly FlowishNode[]): FlowishNode[] {
    const byId = new Map(nodes.map(node => [node.id, node]));
    const ordered: FlowishNode[] = [];
    const visited = new Set<string>();
    const visit = (node: FlowishNode, trail: Set<string>) => {
        if (visited.has(node.id)) return;
        if (trail.has(node.id)) { visited.add(node.id); ordered.push(node); return; } // cycle guard
        trail.add(node.id);
        const parent = node.parentId ? byId.get(node.parentId) : undefined;
        if (parent) visit(parent, trail);
        trail.delete(node.id);
        if (!visited.has(node.id)) { visited.add(node.id); ordered.push(node); }
    };
    for (const node of nodes) visit(node, new Set());
    return ordered;
}

export function buildScene(nodes: readonly FlowishNode[], edges: readonly FlowishEdge[]): DiagramSceneSpec {
    const knownIds = new Set(nodes.map(node => node.id));

    const sceneNodes: SceneNodeSpec[] = parentFirst(nodes).map(node => {
        const data = node.data ?? {};
        const label = typeof data.label === 'string' && data.label ? data.label : node.id;
        const kind = typeof data.kind === 'string' ? data.kind : '';
        const color = [data.bgColor, data.color, data.layerColor]
            .find((candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0)
            ?? '#6B7280';
        return {
            id: node.id,
            ...(node.parentId && knownIds.has(node.parentId) ? { parentId: node.parentId } : {}),
            x: node.position?.x ?? 0,
            y: node.position?.y ?? 0,
            ...nodeSize(node, label, kind),
            label,
            kind,
            color,
            isFrame: data.isFrame === true,
            ...(Array.isArray(data.memberIds) && data.memberIds.every(id => typeof id === 'string')
                ? { memberIds: data.memberIds as string[] }
                : {}),
            ...(data.orientation === 'row' || data.orientation === 'column'
                ? { orientation: data.orientation }
                : {}),
        };
    });

    const sceneEdges: SceneEdgeSpec[] = edges
        .filter(edge => knownIds.has(edge.source) && knownIds.has(edge.target))
        .map(edge => {
            const style = edge.style ?? {};
            const rawPoints = Array.isArray(edge.data?.points)
                ? (edge.data!.points as Array<{ x: number; y: number }>)
                : [];
            return {
                id: edge.id,
                sourceId: edge.source,
                targetId: edge.target,
                ...(typeof edge.label === 'string' && edge.label ? { label: edge.label } : {}),
                color: typeof style.stroke === 'string' ? style.stroke : '#9CA3AF',
                strokeWidth: toNumber(style.strokeWidth) ?? 1.5,
                dashed: typeof style.strokeDasharray === 'string' && style.strokeDasharray.length > 0,
                animated: edge.animated === true,
                // Terminals re-attach to cell perimeters in retained-mode
                // engines; only interior bends are meaningful waypoints.
                points: rawPoints.length > 2 ? rawPoints.slice(1, -1) : [],
            };
        });

    return { nodes: sceneNodes, edges: sceneEdges };
}
