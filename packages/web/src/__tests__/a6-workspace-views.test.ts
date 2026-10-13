import { describe, expect, it } from 'vitest';
import type { MemoElement, MemoModelDTO, WorkspaceMembershipDTO } from '@memoarchitect/tools/browser';
import { partitionsOf, sharedIds } from '../lib/explorer-modes';
import { childrenOf, drillTarget, navigatorRoots } from '../lib/system-navigator';
import { groupUseCases } from '../lib/use-case-groups';

// A small copy of E0's shape: a lab (SoS) made of a mapping system and a recording system, a part
// two systems share, and the clinical use case that includes each system's own.
const el = (id: string, extra: Partial<MemoElement> = {}): MemoElement =>
    ({ id, name: id, kind: 'LogicalComponent', construct: 'part', layer: 'logical', file: 'm.sysml', attributes: {}, ...extra }) as MemoElement;

const elements: MemoElement[] = [
    el('Lab', { isDefinition: true }), el('Lab::mapping', { owner: 'Lab' }), el('Lab::recording', { owner: 'Lab' }),
    el('Mapping', { isDefinition: true }), el('Mapping::isolation', { owner: 'Mapping' }), el('Mapping::engine', { owner: 'Mapping' }),
    el('Recording', { isDefinition: true }), el('Recording::isolation', { owner: 'Recording' }),
    el('Isolation', { isDefinition: true }),
    el('Mapping::port', { owner: 'Mapping', construct: 'port' }),
    el('Dangling', { owner: 'Mapping' }),
    el('ucProcedure', { construct: 'use case', kind: 'UseCase' }), el('ucMap', { construct: 'use case', kind: 'UseCase' }),
    el('ucRecord', { construct: 'use case', kind: 'UseCase' }), el('ucStandalone', { construct: 'use case', kind: 'UseCase' }),
    el('stray', { isDefinition: true }),
];
const membership: WorkspaceMembershipDTO = {
    workspaces: [
        { root: 'Lab', scope: 'sos', name: 'Lab' }, { root: 'Mapping', scope: 'system', name: 'Mapping' },
        { root: 'Recording', scope: 'system', name: 'Recording' },
    ],
    membership: {
        Lab: ['Lab'], 'Lab::mapping': ['Lab'], 'Lab::recording': ['Lab'], ucProcedure: ['Lab'],
        Mapping: ['Mapping'], 'Mapping::isolation': ['Mapping'], 'Mapping::engine': ['Mapping'], ucMap: ['Mapping'],
        Recording: ['Recording'], 'Recording::isolation': ['Recording'], ucRecord: ['Recording'], ucStandalone: ['Recording'],
        Isolation: ['Mapping', 'Recording'],
    },
    shared: ['Isolation'],
    unassigned: ['stray'],
    definitionOf: {
        'Lab::mapping': 'Mapping', 'Lab::recording': 'Recording', 'Mapping::isolation': 'Isolation',
        'Recording::isolation': 'Isolation', 'Mapping::engine': 'Isolation',
    },
    missingSystem: false,
};
const model = {
    elements: Object.fromEntries(elements.map(e => [e.id, e])), relationships: [], errors: [], workspaceMembership: membership,
} as unknown as MemoModelDTO;
const byId = (id: string) => model.elements[id];

describe('explorer modes', () => {
    const at = (id: string, mode: Parameters<typeof partitionsOf>[1]['mode'], workspace: string | null = null) =>
        partitionsOf(byId(id), { mode, membership, workspace })?.map(group => group.id);

    it('lists a shared element under every system that holds it, and flags it Shared', () => {
        expect(at('Isolation', 'system')).toEqual(['ws:Mapping', 'ws:Recording']);
        expect(sharedIds(membership).has('Isolation')).toBe(true);
        expect(sharedIds(membership).has('Mapping')).toBe(false);
    });

    it('orders the system of systems first and leaves an orphan Unassigned', () => {
        const rank = (id: string) => partitionsOf(byId(id), { mode: 'system', membership, workspace: null })![0].rank;
        expect(rank('Lab')).toBeLessThan(rank('Mapping'));
        expect(at('stray', 'system')).toEqual(['unassigned']);
    });

    it('shows only the chosen workspace in a workspace', () => {
        expect(at('Isolation', 'system', 'Recording')).toEqual(['ws:Recording']);
    });

    it('puts Unassigned in the system of systems workspace in layer mode, and only there', () => {
        expect(at('stray', 'layer', 'Lab')).toEqual(['unassigned']);
        expect(at('stray', 'layer', 'Mapping')).toBeUndefined();
        expect(at('Mapping', 'layer', 'Lab')).toBeUndefined();
    });

    it('splits definitions from usages', () => {
        expect(at('Mapping', 'definitionUsage')).toEqual(['definitions']);
        expect(at('Mapping::engine', 'definitionUsage')).toEqual(['usages']);
    });

    it('groups by top-level package', () => {
        expect(partitionsOf(el('x', { package: 'pump::sub' }), { mode: 'package', membership, workspace: null })![0].id).toBe('pkg:pump');
        expect(partitionsOf(el('y'), { mode: 'package', membership, workspace: null })![0].label).toBe('(no package)');
    });

    it('leaves a model with no System to the layers', () => {
        expect(partitionsOf(byId('Lab'), { mode: 'system', membership: { ...membership, missingSystem: true }, workspace: null })).toBeUndefined();
    });
});

describe('system navigator', () => {
    it('starts at the system of systems, or at the chosen system', () => {
        expect(navigatorRoots(model, null).map(n => n.id)).toEqual(['Lab']);
        expect(navigatorRoots(model, 'Recording').map(n => n.id)).toEqual(['Recording']);
    });

    it('drills from the SoS to a leaf component through three definitions', () => {
        const lab = navigatorRoots(model, null)[0];
        expect(lab.hasChildren).toBe(true);
        const mapping = childrenOf(model, lab.id).find(n => n.id === 'Lab::mapping')!;
        expect(mapping.into).toBe('Mapping');
        const isolation = childrenOf(model, mapping.id).find(n => n.id === 'Mapping::isolation')!;
        expect(isolation.into).toBe('Isolation');
        // The leaf: a definition with no parts, and ports are not parts.
        expect(isolation.hasChildren).toBe(false);
        expect(childrenOf(model, isolation.id)).toEqual([]);
        expect(childrenOf(model, 'Mapping').map(n => n.id)).not.toContain('Mapping::port');
    });

    it('treats a usage whose type is not in the model as a leaf', () => {
        expect(drillTarget(model, 'Dangling')).toBeUndefined();
        expect(childrenOf(model, 'Dangling')).toEqual([]);
    });
});

describe('use case groups', () => {
    const ids = ['ucProcedure', 'ucMap', 'ucRecord', 'ucStandalone'];
    const includes = [
        { sourceId: 'ucProcedure', targetId: 'ucMap' }, { sourceId: 'ucProcedure', targetId: 'ucRecord' },
    ];

    it('lists the procedure first, with the system use cases it includes nested, and the rest under their system', () => {
        const groups = groupUseCases(ids, includes, membership, id => id);
        expect(groups.map(g => g.label)).toEqual(['Procedures', 'Recording']);
        expect(groups[0].entries).toEqual([
            { id: 'ucProcedure', depth: 0 }, { id: 'ucMap', depth: 1 }, { id: 'ucRecord', depth: 1 },
        ]);
        // An included case is not also listed at the top of its system.
        expect(groups[1].entries).toEqual([{ id: 'ucStandalone', depth: 0 }]);
    });

    it('is one flat group in a model with no System', () => {
        const groups = groupUseCases(ids, includes, { ...membership, missingSystem: true }, id => id);
        expect(groups).toHaveLength(1);
        expect(groups[0].label).toBeUndefined();
        expect(groups[0].entries.map(e => e.id)).toEqual(['ucProcedure', 'ucMap', 'ucRecord', 'ucStandalone']);
    });

    it('never hides a use case nothing holds', () => {
        const groups = groupUseCases([...ids, 'ucLost'], includes, membership, id => id);
        expect(groups.at(-1)).toMatchObject({ label: 'Unassigned', entries: [{ id: 'ucLost', depth: 0 }] });
    });
});
