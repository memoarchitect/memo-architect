import { describe, expect, it } from 'vitest';
import { analyzeDSM, computeDSM } from './dsm';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';

const element = (id: string, kind: string, group?: string, parentAction?: string) => {
    const attributes: Record<string, string> = {};
    if (group) attributes.group = group;
    return { id, name: id, kind, layer: 'functional', construct: 'action', file: 'model.sysml', attributes, parentAction };
};

const model: MemoModelDTO = {
    errors: [],
    elements: {
        parent: element('parent', 'ActionDefinition', 'Core'),
        first: element('first', 'ActionUsage', 'Core', 'parent'),
        second: element('second', 'ActionUsage', 'Optional', 'parent'),
        external: element('external', 'ActionUsage', 'Core'),
    },
    relationships: [
        { id: 'a', type: 'flow', sourceId: 'first', targetId: 'external', sourceEnd: '', targetEnd: '', file: '' },
        { id: 'b', type: 'flow', sourceId: 'external', targetId: 'first', sourceEnd: '', targetEnd: '', file: '' },
    ],
};

describe('web DSM hierarchy and analysis', () => {
    it('includes and excludes authored groups', () => {
        const dsm = computeDSM(model, { rowKinds: ['ActionUsage'], columnKinds: ['ActionUsage'], includeGroups: ['Core'] });
        expect(dsm.elementIds).toEqual(['external', 'first']);
        expect(dsm.totalDependencies).toBe(2);

        const excluded = computeDSM(model, { rowKinds: ['ActionUsage'], columnKinds: ['ActionUsage'], excludeGroups: ['Core'] });
        expect(excluded.elementIds).toEqual(['second']);
    });

    it('rolls child dependencies up to a selected parent kind', () => {
        const dsm = computeDSM(model, {
            rowKinds: ['ActionUsage'], columnKinds: ['ActionUsage'], hierarchyParentKind: 'ActionDefinition',
        });
        expect(dsm.elementIds).toEqual(['parent', 'external']);
        expect(dsm.elements.parent.memberCount).toBeGreaterThan(1);
        expect(dsm.totalDependencies).toBe(2);
    });

    it('reports simple feedback, coupling, isolation, and degree indicators', () => {
        const dsm = computeDSM(model, { rowKinds: ['ActionUsage'], columnKinds: ['ActionUsage'] });
        expect(analyzeDSM(dsm)).toMatchObject({ coupledPairs: 1, isolatedElements: 1, maxDegree: 2 });
    });
});
