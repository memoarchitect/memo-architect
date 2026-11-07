import { describe, expect, it } from 'vitest';
import { groupBySystem } from '../matrix-views';

describe('matrices grouped by system', () => {
    const names: Record<string, string> = { 'plant::Pump': 'Pump', 'plant::Boiler': 'Boiler' };
    const nameOf = (system: string) => names[system] ?? system;

    it('puts each matrix under the system it traces, systems by name, whole-model ones last', () => {
        const groups = groupBySystem([
            { id: 'a', matrix: { system: 'plant::Pump' } },
            { id: 'b', matrix: {} },
            { id: 'c', matrix: { system: 'plant::Boiler' } },
            { id: 'd', matrix: { system: 'plant::Pump' } },
        ], nameOf);
        expect(groups.map(group => [group.name, group.definitions.map(d => d.id)])).toEqual([
            ['Boiler', ['c']], ['Pump', ['a', 'd']], ['Whole model', ['b']],
        ]);
    });

    it('makes no group for a system with no matrix', () => {
        expect(groupBySystem([], nameOf)).toEqual([]);
    });
});
