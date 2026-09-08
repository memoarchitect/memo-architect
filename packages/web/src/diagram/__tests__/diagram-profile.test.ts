import { describe, expect, it } from 'vitest';
import { resolveDiagramProfile } from '../diagram-profile';

describe('resolveDiagramProfile', () => {
    it('a legacy ucd/context diagramType wins ahead of viewKind', () => {
        expect(resolveDiagramProfile({ diagramType: 'ucd', viewKind: 'interconnection', generalMode: 'graph' }))
            .toBe('usecase');
        expect(resolveDiagramProfile({ diagramType: 'context', viewKind: 'general', generalMode: 'tree' }))
            .toBe('context');
    });

    it('resolves each of the four viewKind-driven profiles', () => {
        expect(resolveDiagramProfile({ viewKind: 'interconnection', generalMode: 'graph' })).toBe('interconnection');
        expect(resolveDiagramProfile({ viewKind: 'actionflow', generalMode: 'graph' })).toBe('actionflow');
        expect(resolveDiagramProfile({ viewKind: 'statetransition', generalMode: 'graph' })).toBe('statetransition');
        expect(resolveDiagramProfile({ viewKind: 'sequence', generalMode: 'graph' })).toBe('sequence');
    });

    it('a general viewKind takes the general template only outside graph mode', () => {
        expect(resolveDiagramProfile({ viewKind: 'general', generalMode: 'tree' })).toBe('general');
        expect(resolveDiagramProfile({ viewKind: 'general', generalMode: 'containment' })).toBe('general');
        expect(resolveDiagramProfile({ viewKind: 'general', generalMode: 'graph' })).toBe('standard');
    });

    it('falls back to standard for grid/browser/geometry and anything undeclared', () => {
        expect(resolveDiagramProfile({ viewKind: 'grid', generalMode: 'graph' })).toBe('standard');
        expect(resolveDiagramProfile({ viewKind: undefined, generalMode: 'graph' })).toBe('standard');
    });
});
