import { describe, expect, it } from 'vitest';
import { presetCounts } from '../use-preset-counts';
import { requirementsOfType, typesOf } from '../trace-presets';

const presets = [
    { id: 'need-software', label: 'Need to software', rows: typesOf('Need'), columns: requirementsOfType('software') },
    { id: 'risk-hardware', label: 'Risk to hardware', rows: typesOf('Risk'), columns: requirementsOfType('hardware') },
];
const types = (axis: { kinds: string[] }) => (axis.kinds.includes('Need') ? 4 : 0);

describe('which quick traces a system can answer', () => {
    it('counts types locally and queries from the answers, once both sides are known', () => {
        const software = requirementsOfType('software').query.trim();
        const hardware = requirementsOfType('hardware').query.trim();
        const counts = presetCounts(presets, types, new Map([[software, 7], [hardware, 2]]));
        expect(counts.get('need-software')).toEqual({ rows: 4, columns: 7 });
        expect(counts.get('risk-hardware')).toEqual({ rows: 0, columns: 2 });
    });

    it('leaves a trace out while its query is still being counted', () => {
        expect(presetCounts(presets, types, new Map()).size).toBe(0);
    });
});
