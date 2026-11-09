import { describe, expect, it } from 'vitest';
import { searchCanvas } from '../canvas-search';

const nodes = [
    { id: 'a', data: { label: 'x' } }, { id: 'b', data: {} }, { id: 'c', data: {} }, { id: 'gone', hidden: true, data: { label: 'valve' } },
    { id: '__lane_label_l', data: { label: 'valve lane' } }, { id: '__lane_l', data: { label: 'valve lane' } }, { id: 'unnamed', data: {} },
];
const model = { elements: { a: { name: 'Open valve', shortId: 'FN-7', kind: 'SystemFunction' }, b: { name: 'valve' }, c: { name: 'Bivalve seal' } } };

describe('search on the canvas', () => {
    it('ranks an exact name, then a start, then a word, then anywhere', () => {
        expect(searchCanvas(nodes, 'valve', model).map(hit => hit.id)).toEqual(['b', '__lane_l', 'a', 'c']);
    });
    it('finds a box by its id and says what it is', () => {
        expect(searchCanvas(nodes, 'fn-7', model)).toEqual([{ id: 'a', name: 'Open valve', detail: 'FN-7 · SystemFunction' }]);
    });
    it('skips hidden boxes and lane captions, and takes a query literally', () => {
        expect(searchCanvas(nodes, 'valve', model).map(hit => hit.id)).not.toContain('gone');
        expect(searchCanvas(nodes, 'valve', model).map(hit => hit.id)).not.toContain('__lane_label_l');
        expect(searchCanvas(nodes, '(', model)).toEqual([]);
    });
    it('finds nothing for nothing', () => {
        expect(searchCanvas(nodes, '   ', model)).toEqual([]);
    });
});
