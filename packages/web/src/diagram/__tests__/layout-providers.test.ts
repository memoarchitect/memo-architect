import { describe, expect, it } from 'vitest';
import type { DiagramLayout } from '@memoarchitect/tools/browser';
import type { LayoutGraph, LayoutProvider } from '../layout-provider';
import { LayoutProviderRegistry } from '../layout-provider-registry';
import { listLayoutProviders, runLayoutProvider } from '../layout-providers';
import { selectedLayoutProviderId, withLayoutProvider } from '../layout-selection';

const flatGraph = (): LayoutGraph => ({
    id: 'root',
    layoutOptions: { 'elk.direction': 'RIGHT' },
    children: [
        { id: 'a', width: 100, height: 50 },
        { id: 'b', width: 100, height: 50 },
    ],
    edges: [{ id: 'a-b', sources: ['a'], targets: ['b'] }],
});

const descriptor = {
    id: 'test.layout',
    name: 'Test layout',
    version: '1.0.0',
    contractVersion: '1' as const,
    license: 'MIT',
    description: 'Test provider',
    mode: 'automatic' as const,
    capabilities: ['flat-graph', 'deterministic'] as const,
};

describe('layout provider registry', () => {
    it('registers, filters, and invokes a provider without mutating input', async () => {
        const registry = new LayoutProviderRegistry();
        const provider: LayoutProvider = {
            descriptor,
            supports: () => ({ supported: true }),
            layout: async graph => {
                const copy = structuredClone(graph) as LayoutGraph;
                copy.children![0].x = 10;
                copy.children![0].y = 20;
                copy.children![1].x = 200;
                copy.children![1].y = 20;
                return copy;
            },
        };
        registry.register(provider);
        const input = flatGraph();
        const output = await registry.layout(input, { providerId: descriptor.id });

        expect(registry.list(['flat-graph']).map(item => item.id)).toEqual([descriptor.id]);
        expect(output.children?.[0]).toMatchObject({ x: 10, y: 20 });
        expect(input.children?.[0].x).toBeUndefined();
    });

    it('rejects unsupported graphs and providers that change node identity', async () => {
        const registry = new LayoutProviderRegistry();
        registry.register({
            descriptor,
            supports: () => ({ supported: false, reason: 'flat graphs only' }),
            layout: async graph => structuredClone(graph) as LayoutGraph,
        });
        await expect(registry.layout(flatGraph(), { providerId: descriptor.id }))
            .rejects.toThrow('flat graphs only');

        registry.unregister(descriptor.id);
        registry.register({
            descriptor,
            supports: () => ({ supported: true }),
            layout: async graph => ({ ...structuredClone(graph), children: [] }) as LayoutGraph,
        });
        await expect(registry.layout(flatGraph(), { providerId: descriptor.id }))
            .rejects.toThrow('changed the graph node identity set');
    });

    it('rejects providers that change edge identity or endpoints', async () => {
        const registry = new LayoutProviderRegistry();
        registry.register({
            descriptor,
            supports: () => ({ supported: true }),
            layout: async graph => ({
                ...structuredClone(graph),
                edges: [{ id: 'a-b', sources: ['b'], targets: ['a'] }],
            }) as LayoutGraph,
        });

        await expect(registry.layout(flatGraph(), { providerId: descriptor.id }))
            .rejects.toThrow('changed the graph edge identity or endpoints');
    });
});

describe('built-in layout providers', () => {
    it('offers ELK and Dagre as automatic providers and fixed as a preserve provider', () => {
        const providers = listLayoutProviders();
        expect(providers).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'memo.layout.elk', mode: 'automatic' }),
            expect.objectContaining({ id: 'memo.layout.dagre', mode: 'automatic' }),
            expect.objectContaining({ id: 'memo.layout.fixed', mode: 'preserve' }),
        ]));
    });

    it('lays out a flat graph with Dagre and preserves input identity', async () => {
        const input = flatGraph();
        const output = await runLayoutProvider(input, { providerId: 'memo.layout.dagre' });

        expect(output.children).toHaveLength(2);
        expect(output.children?.every(node => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true);
        expect(output.children?.[0].x).not.toBe(output.children?.[1].x);
        expect(input.children?.[0].x).toBeUndefined();
    });

    it('uses the fixed provider only when authored positions exist', async () => {
        await expect(runLayoutProvider(flatGraph(), { providerId: 'memo.layout.fixed' }))
            .rejects.toThrow('finite x/y');

        const positioned = flatGraph();
        positioned.children = positioned.children?.map((node, index) => ({ ...node, x: index * 120, y: 20 }));
        const output = await runLayoutProvider(positioned, { providerId: 'memo.layout.fixed' });
        expect(output).toEqual(positioned);
        expect(output).not.toBe(positioned);
    });
});

describe('layout provider persistence', () => {
    it('defaults to ELK and stores a versioned provider selection without losing layout state', () => {
        const layout: DiagramLayout = {
            nodes: { a: { x: 10, y: 20 } },
            edges: {},
            canvas: { zoom: 0.8, autoLayout: true },
        };
        expect(selectedLayoutProviderId(layout)).toBe('memo.layout.elk');

        const dagre = listLayoutProviders().find(provider => provider.id === 'memo.layout.dagre')!;
        const updated = withLayoutProvider(layout, dagre);
        expect(selectedLayoutProviderId(updated)).toBe('memo.layout.dagre');
        expect(updated.nodes.a).toEqual({ x: 10, y: 20 });
        expect(updated.canvas).toMatchObject({
            zoom: 0.8,
            layout: {
                provider: 'memo.layout.dagre',
                providerVersion: dagre.version,
                contractVersion: '1',
            },
        });
    });
});
