import { describe, expect, it } from 'vitest';
import type { MemoElement, MemoRelationship } from '@memoarchitect/tools/browser';
import { GLOBAL_SYSTEM, groupBySystem, isSystemKind } from '../lib/system-grouping';

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
