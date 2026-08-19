import { describe, expect, it } from 'vitest';
import type { MemoElement, MemoRelationship } from '@memoarchitect/tools/browser';
import { GLOBAL_SYSTEM, groupBySystem, isSystemKind, resolveSystem } from '../lib/system-grouping';

const parents = new Map([
    ['System', 'LogicalComponent'],
    ['SystemOfSystems', 'LogicalComponent'],
    ['InfusionSystem', 'System'],
    ['UseCase', 'MemoUseCase'],
    ['Subsystem', 'LogicalComponent'],
]);

const element = (id: string, kind: string, extra: Partial<MemoElement> = {}): MemoElement =>
    ({ id, name: id, kind, layer: 'logical', construct: 'part', ...extra }) as MemoElement;

const index = (...list: MemoElement[]) => new Map(list.map(e => [e.id, e]));

describe('isSystemKind', () => {
    it('accepts the ontology roots', () => {
        expect(isSystemKind('System', parents)).toBe(true);
        expect(isSystemKind('SystemOfSystems', parents)).toBe(true);
    });

    it('accepts a project kind that specializes System', () => {
        expect(isSystemKind('InfusionSystem', parents)).toBe(true);
    });

    it('rejects a sibling structural kind', () => {
        expect(isSystemKind('Subsystem', parents)).toBe(false);
    });
});

describe('resolveSystem', () => {
    const pump = element('pump', 'System');

    it('files a use case under the system that owns it', () => {
        const useCase = element('uc1', 'UseCase', { owner: 'pump' });
        expect(resolveSystem(useCase, index(pump, useCase), [], parents))
            .toEqual({ systemId: 'pump', label: 'pump' });
    });

    it('walks past intermediate owners to the nearest system', () => {
        const subsystem = element('pumpMech', 'Subsystem', { owner: 'pump' });
        const useCase = element('uc1', 'UseCase', { owner: 'pumpMech' });
        expect(resolveSystem(useCase, index(pump, subsystem, useCase), [], parents).systemId).toBe('pump');
    });

    it('uses a single relationship hop whatever the relation is called', () => {
        const useCase = element('uc1', 'UseCase');
        const rels = [{ sourceId: 'uc1', targetId: 'pump', type: 'allocatedTo' }] as MemoRelationship[];
        expect(resolveSystem(useCase, index(pump, useCase), rels, parents).systemId).toBe('pump');
    });

    it('reads an incoming edge too', () => {
        const useCase = element('uc1', 'UseCase');
        const rels = [{ sourceId: 'pump', targetId: 'uc1', type: 'supports' }] as MemoRelationship[];
        expect(resolveSystem(useCase, index(pump, useCase), rels, parents).systemId).toBe('pump');
    });

    it('falls back to Global when a hop reaches two systems', () => {
        const other = element('monitor', 'System');
        const useCase = element('uc1', 'UseCase');
        const rels = [
            { sourceId: 'uc1', targetId: 'pump', type: 'allocatedTo' },
            { sourceId: 'uc1', targetId: 'monitor', type: 'allocatedTo' },
        ] as MemoRelationship[];
        expect(resolveSystem(useCase, index(pump, other, useCase), rels, parents))
            .toEqual({ label: GLOBAL_SYSTEM });
    });

    it('files an untraced use case under Global', () => {
        const useCase = element('uc1', 'UseCase');
        expect(resolveSystem(useCase, index(useCase), [], parents)).toEqual({ label: GLOBAL_SYSTEM });
    });

    it('resolves a system to itself', () => {
        expect(resolveSystem(pump, index(pump), [], parents).systemId).toBe('pump');
    });

    it('terminates on an ownership cycle', () => {
        const a = element('a', 'UseCase', { owner: 'b' });
        const b = element('b', 'UseCase', { owner: 'a' });
        expect(resolveSystem(a, index(a, b), [], parents)).toEqual({ label: GLOBAL_SYSTEM });
    });
});

describe('groupBySystem', () => {
    it('orders systems by name and pins Global last', () => {
        const groups = groupBySystem(
            [
                { id: 1, res: { label: GLOBAL_SYSTEM } },
                { id: 2, res: { systemId: 'z', label: 'Zeta' } },
                { id: 3, res: { systemId: 'a', label: 'Alpha' } },
                { id: 4, res: { systemId: 'a', label: 'Alpha' } },
            ],
            item => item.res,
        );
        expect(groups.map(group => [group.label, group.items.length]))
            .toEqual([['Alpha', 2], ['Zeta', 1], [GLOBAL_SYSTEM, 1]]);
    });
});
