import { describe, expect, it } from 'vitest';
import { RendererRegistry } from '../renderer-registry';
import {
    DEFAULT_RENDERER_ID, hasRendererCapabilities,
    type DiagramCanvasComponent, type DiagramRendererProvider,
} from '../renderer-provider';

const component = (() => null) as DiagramCanvasComponent;

function provider(id: string, capabilities: DiagramRendererProvider['descriptor']['capabilities'] = []): DiagramRendererProvider {
    return {
        descriptor: {
            id,
            name: id.split('.').pop() ?? id,
            engine: 'test',
            version: '1',
            contractVersion: '1',
            license: 'MIT',
            description: 'test provider',
            capabilities,
        },
        loadComponent: () => Promise.resolve(component),
    };
}

describe('RendererRegistry', () => {
    it('registers and lists providers sorted by name, filtered by capability', () => {
        const registry = new RendererRegistry();
        registry.register(provider('memo.renderer.zeta', ['manual-layout']));
        registry.register(provider('memo.renderer.alpha', ['manual-layout', 'interactive-editing']));

        expect(registry.list().map(d => d.name)).toEqual(['alpha', 'zeta']);
        expect(registry.list(['interactive-editing']).map(d => d.id)).toEqual(['memo.renderer.alpha']);
    });

    it('rejects duplicate registration of a different provider under the same id', () => {
        const registry = new RendererRegistry();
        registry.register(provider('memo.renderer.a'));
        expect(() => registry.register(provider('memo.renderer.a'))).toThrow(/already registered/);
    });

    it('is idempotent for re-registering the identical provider instance', () => {
        const registry = new RendererRegistry();
        const instance = provider('memo.renderer.a');
        registry.register(instance);
        expect(() => registry.register(instance)).not.toThrow();
    });

    it('falls back to the default renderer for unknown ids', async () => {
        const registry = new RendererRegistry();
        registry.register(provider(DEFAULT_RENDERER_ID));
        await expect(registry.loadComponent('memo.renderer.missing')).resolves.toBe(component);
    });

    it('throws when neither the requested id nor the default is registered', async () => {
        const registry = new RendererRegistry();
        registry.register(provider('memo.renderer.other'));
        expect(() => registry.loadComponent('memo.renderer.missing')).toThrow(/not found/);
    });

    it('memoizes component loads per provider', async () => {
        const registry = new RendererRegistry();
        let loads = 0;
        registry.register({
            ...provider('memo.renderer.counted'),
            loadComponent: () => { loads += 1; return Promise.resolve(component); },
        });
        await registry.loadComponent('memo.renderer.counted');
        await registry.loadComponent('memo.renderer.counted');
        expect(loads).toBe(1);
    });
});

describe('hasRendererCapabilities', () => {
    it('checks required capabilities against the descriptor', () => {
        const descriptor = provider('memo.renderer.x', ['manual-layout', 'export-image']).descriptor;
        expect(hasRendererCapabilities(descriptor, ['manual-layout'])).toBe(true);
        expect(hasRendererCapabilities(descriptor, ['manual-layout', 'undo-redo'])).toBe(false);
    });
});
