import type { DiagramCanvasComponent, DiagramRendererProvider, RendererCapability } from './renderer-provider';
import { RendererRegistry } from './renderer-registry';

const reactFlowRenderer: DiagramRendererProvider = {
    descriptor: {
        id: 'memo.renderer.reactflow',
        name: 'ReactFlow',
        engine: 'ReactFlow (@xyflow/react 12)',
        version: '12',
        contractVersion: '1',
        license: 'MIT',
        description: 'Default authoring canvas — React node components, palette, full editing.',
        capabilities: [
            'interactive-editing', 'all-view-kinds', 'manual-layout',
            'undo-redo', 'minimap', 'orthogonal-routes',
        ],
    },
    loadComponent: () =>
        import('../views/DiagramCanvas').then(m => m.DiagramCanvas as DiagramCanvasComponent),
};

const maxGraphRenderer: DiagramRendererProvider = {
    descriptor: {
        id: 'memo.renderer.maxgraph',
        name: 'maxGraph',
        engine: 'maxGraph (@maxgraph/core — draw.io rendering engine lineage)',
        version: '0.x',
        contractVersion: '1',
        license: 'Apache-2.0',
        description: 'draw.io-style retained-mode canvas — SVG cells, rubberband selection, image export.',
        capabilities: ['all-view-kinds', 'manual-layout', 'export-image'],
    },
    loadComponent: () =>
        import('./renderers/maxgraph/MaxGraphCanvas').then(m => m.MaxGraphCanvas as DiagramCanvasComponent),
};

export const rendererRegistry = new RendererRegistry();
rendererRegistry.register(reactFlowRenderer);
rendererRegistry.register(maxGraphRenderer);
rendererRegistry.register({
    descriptor: {
        id: 'memo.renderer.jointjs', name: 'JointJS IBD',
        engine: 'JointJS (@joint/core 4.1.3)', version: '4.1.3', contractVersion: '1',
        license: 'MPL-2.0', description: 'Experimental IBD routing comparison; separate saved geometry.',
        capabilities: ['manual-layout'],
    },
    loadComponent: () => import('./renderers/jointjs/JointJsCanvas').then(m => m.JointJsCanvas),
});
rendererRegistry.register({
    descriptor: {
        id: 'memo.renderer.x6', name: 'AntV X6 IBD',
        engine: 'AntV X6 3', version: '3.1.8', contractVersion: '1', license: 'MIT',
        description: 'Experimental IBD comparison with built-in Manhattan routing, ports, and retained-mode editing.',
        capabilities: ['manual-layout', 'orthogonal-routes'],
    },
    loadComponent: () => import('./renderers/x6/X6Canvas').then(m => m.X6Canvas),
});

export function registerRenderer(provider: DiagramRendererProvider): void {
    rendererRegistry.register(provider);
}

export function listRenderers(required: readonly RendererCapability[] = []) {
    return rendererRegistry.list(required);
}
