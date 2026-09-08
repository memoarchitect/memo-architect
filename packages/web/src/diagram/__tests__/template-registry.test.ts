import { describe, expect, it } from 'vitest';
import { TemplateRegistry } from '../template-registry';
import { templateRegistry } from '../templates';
import type { DiagramTemplateProvider, TemplateSelectionContext } from '../template-provider';
import { resolveDiagramProfile, type DiagramProfileInput } from '../diagram-profile';

const context = (overrides: Partial<TemplateSelectionContext> = {}): TemplateSelectionContext => ({
    diagramProfile: 'standard',
    ...overrides,
});

/** Builds a context the way the canvas does: resolve the raw view fields to one profile. */
const contextFor = (input: Partial<DiagramProfileInput>): TemplateSelectionContext => ({
    diagramProfile: resolveDiagramProfile({ generalMode: 'graph', ...input }),
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
        registry.register(provider('a', ctx => ctx.diagramProfile === 'usecase'));
        registry.register(provider('b', () => true));
        expect(registry.select(context({ diagramProfile: 'usecase' })).descriptor.id).toBe('a');
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
    it('reproduces the dispatch precedence', () => {
        expect(templateRegistry.list().map(d => d.id)).toEqual([
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

    it('selects by the single resolved diagramProfile', () => {
        expect(templateRegistry.select(contextFor({ diagramType: 'ucd', viewKind: 'interconnection' })).descriptor.id)
            .toBe('memo.template.usecase');
        expect(templateRegistry.select(contextFor({ diagramType: 'context' })).descriptor.id)
            .toBe('memo.template.context');
        expect(templateRegistry.select(contextFor({ viewKind: 'interconnection' })).descriptor.id)
            .toBe('memo.template.interconnection');
        expect(templateRegistry.select(contextFor({ viewKind: 'actionflow' })).descriptor.id)
            .toBe('memo.template.actionflow');
        expect(templateRegistry.select(contextFor({ viewKind: 'statetransition' })).descriptor.id)
            .toBe('memo.template.statetransition');
        expect(templateRegistry.select(contextFor({ viewKind: 'sequence' })).descriptor.id)
            .toBe('memo.template.sequence');
        expect(templateRegistry.select(contextFor({ viewKind: 'general', generalMode: 'tree' })).descriptor.id)
            .toBe('memo.template.general');
        expect(templateRegistry.select(contextFor({ viewKind: 'general', generalMode: 'containment' })).descriptor.id)
            .toBe('memo.template.general');
        expect(templateRegistry.select(contextFor({ viewKind: 'general', generalMode: 'graph' })).descriptor.id)
            .toBe('memo.template.standard');
        expect(templateRegistry.select(contextFor({})).descriptor.id)
            .toBe('memo.template.standard');
    });

    it('a legacy ucd/context diagramType wins over its own general viewKind', () => {
        // Both `ucd` and `context` resolve to the `general` view kind (see
        // memo-tools view-kinds.ts DIAGRAM_TYPE_TO_VIEW_KIND), but keep their
        // specialized templates rather than falling into the general template.
        expect(templateRegistry.select(contextFor({ diagramType: 'ucd', viewKind: 'general', generalMode: 'tree' })).descriptor.id)
            .toBe('memo.template.usecase');
        expect(templateRegistry.select(contextFor({ diagramType: 'context', viewKind: 'general', generalMode: 'tree' })).descriptor.id)
            .toBe('memo.template.context');
    });
});
