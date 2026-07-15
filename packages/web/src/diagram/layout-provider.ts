/** Vendor-neutral graph consumed and produced by layout providers. */
export interface LayoutGraphNode {
    id: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    children?: LayoutGraphNode[];
    ports?: Array<{ id: string; x?: number; y?: number; width?: number; height?: number }>;
    layoutOptions?: Record<string, string>;
}

export interface LayoutGraphEdgeSection {
    id?: string;
    startPoint?: { x: number; y: number };
    endPoint?: { x: number; y: number };
    bendPoints?: Array<{ x: number; y: number }>;
}

export interface LayoutGraphEdge {
    id: string;
    sources: string[];
    targets: string[];
    sections?: LayoutGraphEdgeSection[];
}

export interface LayoutGraph extends LayoutGraphNode {
    children?: LayoutGraphNode[];
    edges?: LayoutGraphEdge[];
}

export type LayoutCapability =
    | 'flat-graph'
    | 'compound-graph'
    | 'explicit-ports'
    | 'orthogonal-routes'
    | 'fixed-nodes'
    | 'deterministic'
    | 'cancellable'
    | 'worker-runtime';

export interface LayoutProviderDescriptor {
    id: string;
    name: string;
    version: string;
    contractVersion: '1';
    license: string;
    description: string;
    mode: 'automatic' | 'preserve';
    capabilities: readonly LayoutCapability[];
}

export interface LayoutSupportResult {
    supported: boolean;
    reason?: string;
}

export interface LayoutExecutionContext {
    signal?: AbortSignal;
    timeoutMs?: number;
}

export interface LayoutProvider {
    readonly descriptor: LayoutProviderDescriptor;
    supports(graph: Readonly<LayoutGraph>): LayoutSupportResult;
    layout(graph: Readonly<LayoutGraph>, context?: LayoutExecutionContext): Promise<LayoutGraph>;
    dispose?(): void | Promise<void>;
}

export interface LayoutRunOptions extends LayoutExecutionContext {
    providerId?: string;
}

export const DEFAULT_LAYOUT_PROVIDER_ID = 'memo.layout.elk';

export function hasLayoutCapabilities(
    descriptor: LayoutProviderDescriptor,
    required: readonly LayoutCapability[],
): boolean {
    const available = new Set(descriptor.capabilities);
    return required.every(capability => available.has(capability));
}

export function cloneLayoutGraph<T extends LayoutGraph>(graph: Readonly<T>): T {
    return structuredClone(graph) as T;
}

export function assertValidLayoutResult(input: Readonly<LayoutGraph>, output: Readonly<LayoutGraph>): void {
    const collectIds = (node: Readonly<LayoutGraphNode>, ids: Set<string>) => {
        if (ids.has(node.id)) throw new Error(`Layout result contains duplicate node id: ${node.id}`);
        ids.add(node.id);
        if (node.x !== undefined && !Number.isFinite(node.x)) throw new Error(`Layout result has invalid x for ${node.id}`);
        if (node.y !== undefined && !Number.isFinite(node.y)) throw new Error(`Layout result has invalid y for ${node.id}`);
        for (const child of node.children ?? []) collectIds(child, ids);
    };

    const inputIds = new Set<string>();
    const outputIds = new Set<string>();
    collectIds(input, inputIds);
    collectIds(output, outputIds);
    if (inputIds.size !== outputIds.size || [...inputIds].some(id => !outputIds.has(id))) {
        throw new Error('Layout provider changed the graph node identity set');
    }

    const edgeSignature = (edge: Readonly<LayoutGraphEdge>) =>
        `${edge.id}\u0000${edge.sources.join('\u0000')}\u0000${edge.targets.join('\u0000')}`;
    const inputEdges = new Set((input.edges ?? []).map(edgeSignature));
    const outputEdges = new Set((output.edges ?? []).map(edgeSignature));
    if (inputEdges.size !== outputEdges.size || [...inputEdges].some(edge => !outputEdges.has(edge))) {
        throw new Error('Layout provider changed the graph edge identity or endpoints');
    }
}
