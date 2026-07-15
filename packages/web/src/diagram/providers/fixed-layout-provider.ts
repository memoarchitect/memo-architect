import { cloneLayoutGraph, type LayoutGraph, type LayoutGraphNode, type LayoutProvider } from '../layout-provider';

const allNodesPositioned = (node: Readonly<LayoutGraphNode>): boolean =>
    (node.id === 'root' || (Number.isFinite(node.x) && Number.isFinite(node.y)))
    && (node.children ?? []).every(allNodesPositioned);

export class FixedLayoutProvider implements LayoutProvider {
    readonly descriptor = {
        id: 'memo.layout.fixed',
        name: 'Fixed / authored',
        version: '1.0.0',
        contractVersion: '1' as const,
        license: 'Internal',
        description: 'Preserves existing authored geometry without automatic rearrangement.',
        mode: 'preserve' as const,
        capabilities: ['flat-graph', 'compound-graph', 'explicit-ports', 'fixed-nodes', 'deterministic'] as const,
    };

    supports(graph: Readonly<LayoutGraph>) {
        const supported = allNodesPositioned(graph);
        return {
            supported,
            ...(!supported ? { reason: 'every node must already have finite x/y coordinates' } : {}),
        };
    }

    async layout(graph: Readonly<LayoutGraph>): Promise<LayoutGraph> {
        return cloneLayoutGraph(graph);
    }
}
