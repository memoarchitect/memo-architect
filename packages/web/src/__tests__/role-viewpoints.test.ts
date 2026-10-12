import { describe, expect, it } from 'vitest';
import type { ViewpointDTO } from '@memoarchitect/tools/browser';
import { roleLabel, viewpointsVisibleToRole } from '../lib/role-viewpoints';

const vp = (id: string, stakeholders: string[], parentId?: string): ViewpointDTO => ({
    id, label: id, stakeholders, ...(parentId ? { parentId } : {}),
    visibleKinds: [], visibleRelationships: [], visibleLayers: [],
});

const ALL = [
    vp('risk', ['safetyEngineer']),
    vp('software', ['softwareArchitect']),
    vp('usability', ['usabilityEngineer', 'safetyEngineer']),
    vp('projectOwn', []),
    vp('sos', ['systemArchitect']),
    vp('pumpRisk', ['safetyEngineer'], 'sos'),
];

describe('the viewpoints a role sees', () => {
    it('are all of them when no role is chosen', () => {
        expect(viewpointsVisibleToRole(ALL, null).map(v => v.id)).toEqual(ALL.map(v => v.id));
    });

    it('are the ones that name the role, the ones that name nobody, and the frames of those', () => {
        expect(viewpointsVisibleToRole(ALL, 'safetyEngineer').map(v => v.id))
            .toEqual(['risk', 'usability', 'projectOwn', 'sos', 'pumpRisk']);
        expect(viewpointsVisibleToRole(ALL, 'softwareArchitect').map(v => v.id))
            .toEqual(['software', 'projectOwn']);
    });

    it('label a role by its usage name, read as words', () => {
        expect(roleLabel('safetyEngineer')).toBe('Safety Engineer');
    });
});
