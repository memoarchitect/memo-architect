import dagre from '@dagrejs/dagre';
import { cloneLayoutGraph, type LayoutGraph, type LayoutProvider } from '../layout-provider';

const hasNestedChildren = (graph: Readonly<LayoutGraph>): boolean =>
    (graph.children ?? []).some(child => (child.children?.length ?? 0) > 0 || (child.ports?.length ?? 0) > 0);

const rankDirection = (direction?: string): 'TB' | 'BT' | 'LR' | 'RL' => {
    switch (direction) {
        case 'UP': return 'BT';
        case 'RIGHT': return 'LR';
        case 'LEFT': return 'RL';
        default: return 'TB';
    }
};

export class DagreLayoutProvider implements LayoutProvider {
    readonly descriptor = {
        id: 'memo.layout.dagre',
        name: 'Dagre',
        version: (dagre as typeof dagre & { version: string }).version,
        contractVersion: '1' as const,
        license: 'MIT',
        description: 'Fast directed layout for flat graphs and trees.',
        mode: 'automatic' as const,
        capabilities: ['flat-graph', 'deterministic'] as const,
    };

    supports(graph: Readonly<LayoutGraph>) {
        const supported = !hasNestedChildren(graph);
        return {
            supported,
            ...(!supported ? { reason: 'compound nodes and explicit ports require a different provider' } : {}),
        };
    }

    async layout(graph: Readonly<LayoutGraph>): Promise<LayoutGraph> {
        const output = cloneLayoutGraph(graph);
        const options = graph.layoutOptions ?? {};
        const dagreGraph = new dagre.graphlib.Graph({ multigraph: true })
            .setGraph({
                rankdir: rankDirection(options['elk.direction']),
                nodesep: Number(options['elk.spacing.nodeNode'] ?? 40),
                ranksep: Number(options['elk.layered.spacing.nodeNodeBetweenLayers'] ?? 80),
                marginx: 20,
                marginy: 20,
            })
            .setDefaultEdgeLabel(() => ({}));

        for (const child of output.children ?? []) {
            dagreGraph.setNode(child.id, { width: child.width ?? 1, height: child.height ?? 1 });
        }
        for (const edge of output.edges ?? []) {
            const source = edge.sources[0];
            const target = edge.targets[0];
            if (source && target && dagreGraph.hasNode(source) && dagreGraph.hasNode(target)) {
                dagreGraph.setEdge(source, target, {}, edge.id);
            }
        }

        dagre.layout(dagreGraph);
        for (const child of output.children ?? []) {
            const node = dagreGraph.node(child.id);
            if (!node) continue;
            child.x = node.x - (child.width ?? 1) / 2;
            child.y = node.y - (child.height ?? 1) / 2;
        }
        for (const edge of output.edges ?? []) {
            const source = edge.sources[0];
            const target = edge.targets[0];
            if (!source || !target || !dagreGraph.hasEdge(source, target, edge.id)) continue;
            const laidOut = dagreGraph.edge(source, target, edge.id) as { points?: Array<{ x: number; y: number }> } | undefined;
            const points = laidOut?.points ?? [];
            if (points.length >= 2) {
                edge.sections = [{
                    id: `${edge.id}-section`,
                    startPoint: points[0],
                    endPoint: points[points.length - 1],
                    bendPoints: points.slice(1, -1),
                }];
            }
        }

        const dimensions = dagreGraph.graph() as { width?: number; height?: number };
        output.width = dimensions.width;
        output.height = dimensions.height;
        return output;
    }
}
