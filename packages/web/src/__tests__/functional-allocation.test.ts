import { describe, expect, it } from 'vitest';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { allocationSummary, allocationTargets } from '../lib/functional-allocation';

const element = (id: string, kind: string, extra: Record<string, unknown> = {}) =>
    ({ id, name: id, kind, construct: 'part', layer: 'logical', file: 'm.sysml', attributes: {}, ...extra });

function model(relationships: MemoModelDTO['relationships'] = [], rules = true): MemoModelDTO {
    return {
        elements: {
            Pump: element('Pump', 'System', { isDefinition: true }), pump: element('pump', 'System'),
            Server: element('Server', 'System', { isDefinition: true }), server: element('server', 'System'),
            controller: element('controller', 'LogicalComponent'), board: element('board', 'HardwareComponent'),
            fn: element('fn', 'SystemFunction', { construct: 'action', doc: 'Does it.' }), other: element('other', 'SystemFunction', { construct: 'action' }),
        },
        relationships, errors: [],
        registries: {
            kinds: [{ name: 'System', label: 'System' }, { name: 'LogicalComponent', label: 'Logical component' }, { name: 'HardwareComponent', label: 'Hardware component' }, { name: 'SystemFunction', label: 'System function' }] as never,
            relationships: rules ? [{ name: 'allocatedTo', sysmlName: 'AllocatedTo', label: 'Allocated to', layer: 'core', sourceEnd: { name: 'source', type: 'SystemFunction' }, targetEnd: { name: 'target', type: 'LogicalComponent' } }] as never : [],
        },
        workspaceMembership: {
            workspaces: [{ root: 'Pump', name: 'Pump', scope: 'system' }, { root: 'Server', name: 'Server', scope: 'system' }],
            membership: { pump: ['Pump'], controller: ['Pump'], board: ['Pump'], fn: ['Pump'], server: ['Server'] },
            shared: [], unassigned: [], definitionOf: { pump: 'Pump', server: 'Server' }, missingSystem: false,
        },
    } as unknown as MemoModelDTO;
}

describe('where a system function can be allocated', () => {
    const functions = (m: MemoModelDTO) => [m.elements.fn, m.elements.other];

    it('offers systems through their usages, never their definitions, and only the kinds the method allows', () => {
        const m = model([], false);
        const targets = allocationTargets(m, 'Pump', ['System', 'LogicalComponent'], functions(m)).map(target => target.element.id);
        expect(targets).toEqual(['pump', 'server', 'controller']);
        expect(targets).not.toContain('Pump');
        expect(targets).not.toContain('board');
    });

    it('drops a target the ontology does not let a function be allocated to, unless it already is', () => {
        const m = model([{ id: 'a', type: 'allocatedTo', sourceId: 'fn', targetId: 'server' } as never]);
        const targets = allocationTargets(m, 'Pump', ['System', 'LogicalComponent'], functions(m)).map(target => target.element.id);
        expect(targets).toContain('controller');
        expect(targets).toContain('server');
        expect(targets).not.toContain('pump');
    });

    it('counts allocated functions and written purposes', () => {
        const m = model([{ id: 'a', type: 'allocatedTo', sourceId: 'fn', targetId: 'controller' } as never]);
        expect(allocationSummary(m, functions(m))).toEqual({ allocated: 1, total: 2, withPurpose: 1 });
    });
});
