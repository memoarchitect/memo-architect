import { describe, expect, it } from 'vitest';
import { neighbourGroups } from '../node-neighbours';

const name = (id: string) => id.toUpperCase();
const control = (source: string, target: string, label?: string) => ({ source, target, label, data: { flowCategory: 'control' } });
const flow = (source: string, target: string, flowItem: string) => ({ source, target, data: { flowCategory: 'data', flowItem } });

describe('what a box is connected to', () => {
    it('groups neighbours by what they are to the box', () => {
        const groups = neighbourGroups('b', [control('a', 'b'), control('b', 'c', '[ok]'), flow('a', 'b', 'Sig'), flow('b', 'd', 'Cmd')], name);
        expect(groups).toEqual([
            { heading: 'Comes after', items: [{ id: 'a', name: 'A', note: undefined }] },
            { heading: 'Leads to', items: [{ id: 'c', name: 'C', note: '[ok]' }] },
            { heading: 'Receives from', items: [{ id: 'a', name: 'A', note: 'Sig' }] },
            { heading: 'Sends to', items: [{ id: 'd', name: 'D', note: 'Cmd' }] },
        ]);
    });
    it('names a neighbour once, with everything that crosses', () => {
        const [group] = neighbourGroups('a', [flow('a', 'b', 'X'), flow('a', 'b', 'Y'), flow('a', 'b', 'X')], name);
        expect(group.items).toEqual([{ id: 'b', name: 'B', note: 'X, Y' }]);
    });
    it('calls any other connector a connection, and ignores hidden ones and loops', () => {
        expect(neighbourGroups('a', [{ source: 'a', target: 'b', label: 'can' }, { source: 'c', target: 'a', hidden: true }, { source: 'a', target: 'a' }], name))
            .toEqual([{ heading: 'Connected to', items: [{ id: 'b', name: 'B', note: 'can' }] }]);
    });
});
