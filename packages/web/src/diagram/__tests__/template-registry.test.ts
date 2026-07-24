import { describe, expect, it } from 'vitest';
import { TemplateRegistry } from '../template-registry';
import { templateRegistry } from '../templates';
import type { DiagramTemplateProvider, TemplateSelectionContext } from '../template-provider';

const context = (overrides: Partial<TemplateSelectionContext> = {}): TemplateSelectionContext => ({
    viewKind: 'general',
    diagramType: undefined,
    isFBSDiagram: false,
    isDecompDiagram: false,
    isGeneralTemplate: false,
    generalMode: 'graph',
    layoutStyle: 'containment',
    ...overrides,
});

const provider = (id: string, matches: (ctx: TemplateSelectionContext) => boolean): DiagramTemplateProvider => ({
    descriptor: {
        id, name: id, label: id, contractVersion: '1', interactive: false, description: id,
    },
    matches,
    compute: () => ({ nodes: [], edges: [] }),
});

describe('TemplateRegistry', () => {
    it('selects the first registered match — registration order is precedence', () => {
        const registry = new TemplateRegistry();
        registry.register(provider('a', ctx => ctx.isFBSDiagram));
        registry.register(provider('b', () => true));
        expect(registry.select(context({ isFBSDiagram: true })).descriptor.id).toBe('a');
        expect(registry.select(context()).descriptor.id).toBe('b');
    });

    it('registerBefore inserts ahead of an existing provider', () => {
        const registry = new TemplateRegistry();
        registry.register(provider('catchall', () => true));
        registry.register(provider('plugin', () => true), 'catchall');
        expect(registry.select(context()).descriptor.id).toBe('plugin');
        expect(registry.list().map(d => d.id)).toEqual(['plugin', 'catchall']);
    });

    it('rejects a different provider under an existing id and throws without a match', () => {
        const registry = new TemplateRegistry();
        registry.register(provider('a', () => false));
        expect(() => registry.register(provider('a', () => false))).toThrow(/already registered/);
        expect(() => registry.select(context())).toThrow(/No diagram template/);
    });

    it('unregister removes from both id lookup and precedence order', () => {
        const registry = new TemplateRegistry();
        registry.register(provider('a', () => true));
        registry.register(provider('b', () => true));
        expect(registry.unregister('a')).toBe(true);
        expect(registry.has('a')).toBe(false);
        expect(registry.select(context()).descriptor.id).toBe('b');
    });
});

describe('built-in template registration', () => {
    it('reproduces the legacy dispatch precedence', () => {
        expect(templateRegistry.list().map(d => d.id)).toEqual([
            'memo.template.fbs',
            'memo.template.decomposition',
            'memo.template.containment',
            'memo.template.usecase',
            'memo.template.context',
            'memo.template.interconnection',
            'memo.template.actionflow',
            'memo.template.statetransition',
            'memo.template.sequence',
            'memo.template.general',
            'memo.template.standard',
        ]);
    });

    it('selects by the same discriminators as the legacy chain', () => {
        expect(templateRegistry.select(context({ isFBSDiagram: true, isDecompDiagram: true })).descriptor.id)
            .toBe('memo.template.fbs');
        expect(templateRegistry.select(context({ isDecompDiagram: true, layoutStyle: 'decomposition' })).descriptor.id)
            .toBe('memo.template.decomposition');
        expect(templateRegistry.select(context({ isDecompDiagram: true })).descriptor.id)
            .toBe('memo.template.containment');
        expect(templateRegistry.select(context({ diagramType: 'ucd', viewKind: 'interconnection' })).descriptor.id)
            .toBe('memo.template.usecase');
        expect(templateRegistry.select(context({ diagramType: 'context' })).descriptor.id)
            .toBe('memo.template.context');
        expect(templateRegistry.select(context({ viewKind: 'interconnection' })).descriptor.id)
            .toBe('memo.template.interconnection');
        expect(templateRegistry.select(context({ viewKind: 'statetransition' })).descriptor.id)
            .toBe('memo.template.statetransition');
        expect(templateRegistry.select(context({ isGeneralTemplate: true, generalMode: 'tree' })).descriptor.id)
            .toBe('memo.template.general');
        expect(templateRegistry.select(context({ isGeneralTemplate: true, generalMode: 'graph' })).descriptor.id)
            .toBe('memo.template.standard');
        expect(templateRegistry.select(context()).descriptor.id)
            .toBe('memo.template.standard');
    });
});
