// ─── Composition tree tests (KK-2/KK-3 template structure logic) ────────────

import { describe, it, expect } from 'vitest';
import type { MemoElement, MemoRelationship } from '@memo/tools/browser';
import {
    buildCompositionTree, collectTreeIds, pickCompartmentEntries,
    COMPOSITION_REL_TYPES, validateSingleTree,
} from '../composition-tree';

function el(id: string, overrides: Partial<MemoElement> = {}): MemoElement {
    return {
        id,
        name: id,
        kind: 'LogicalComponent',
        construct: 'part',
        layer: 'logical',
        file: 'test.sysml',
        attributes: {},
        ...overrides,
    };
}

function rel(type: string, sourceId: string, targetId: string): MemoRelationship {
    return {
        id: `r-${type}-${sourceId}-${targetId}`,
        type, sourceId, targetId,
        sourceEnd: '', targetEnd: '', file: 'test.sysml',
    };
}

describe('buildCompositionTree', () => {
    it('derives hierarchy from composes relationships among the given elements', () => {
        const elements = [el('device'), el('sensors'), el('airSensor'), el('sw')];
        const rels = [
            rel('composes', 'device', 'sensors'),
            rel('composes', 'sensors', 'airSensor'),
            rel('composes', 'device', 'sw'),
        ];
        const tree = buildCompositionTree(elements, rels);
        expect(tree.roots).toEqual(['device']);
        expect(tree.childrenMap.get('device')).toEqual(['sensors', 'sw']);
        expect(tree.childrenMap.get('sensors')).toEqual(['airSensor']);
    });

    it('supports every composition relationship type', () => {
        expect([...COMPOSITION_REL_TYPES].sort()).toEqual(
            ['aggregation', 'composedOf', 'composes', 'decomposedBy'].sort()
        );
        for (const type of COMPOSITION_REL_TYPES) {
            const tree = buildCompositionTree([el('a'), el('b')], [rel(type, 'a', 'b')]);
            expect(tree.roots).toEqual(['a']);
            expect(tree.childrenMap.get('a')).toEqual(['b']);
        }
    });

    it('ignores edges whose endpoints are outside the element set', () => {
        const tree = buildCompositionTree(
            [el('a'), el('b')],
            [rel('composes', 'a', 'zzz'), rel('composes', 'zzz', 'b')],
        );
        expect(tree.roots.sort()).toEqual(['a', 'b']);
        expect(tree.childrenMap.size).toBe(0);
    });

    it('keeps a single parent per element and tolerates self-references', () => {
        const tree = buildCompositionTree(
            [el('p1'), el('p2'), el('c')],
            [
                rel('composes', 'c', 'c'),
                rel('composes', 'p1', 'c'),
                rel('composedOf', 'p2', 'c'),
            ],
        );
        expect(tree.childrenMap.get('p1')).toEqual(['c']);
        expect(tree.childrenMap.get('p2')).toBeUndefined();
        expect(tree.roots.sort()).toEqual(['p1', 'p2']);
    });

    it('leaves unconnected elements as isolated roots', () => {
        const tree = buildCompositionTree([el('lonely')], []);
        expect(tree.roots).toEqual(['lonely']);
    });
});

describe('collectTreeIds', () => {
    it('collects every element reachable from the roots', () => {
        const tree = buildCompositionTree(
            [el('a'), el('b'), el('c'), el('d')],
            [rel('composes', 'a', 'b'), rel('composes', 'b', 'c')],
        );
        expect([...collectTreeIds(tree)].sort()).toEqual(['a', 'b', 'c', 'd']);
    });
});

describe('validateSingleTree', () => {
    it('rejects forests and floating BDD elements', () => {
        const tree = buildCompositionTree(
            [el('root'), el('child'), el('floating')],
            [rel('composes', 'root', 'child')],
        );
        expect(validateSingleTree(tree)).toEqual({
            rootIds: ['root', 'floating'],
            disconnectedIds: ['floating'],
        });
    });

    it('accepts one connected hierarchy', () => {
        const tree = buildCompositionTree(
            [el('root'), el('child'), el('leaf')],
            [rel('composes', 'root', 'child'), rel('composes', 'child', 'leaf')],
        );
        expect(validateSingleTree(tree)).toBeNull();
    });
});

describe('pickCompartmentEntries', () => {
    it('prefers the short id and short attribute values', () => {
        const entries = pickCompartmentEntries(el('pump', {
            shortId: 'LOG-4711',
            attributes: {
                description: 'A very long prose description that never belongs in a box',
                riskClass: 'ClassC',
                interfaceKind: 'InterfaceKind::digitalSignal',
            },
        }));
        expect(entries[0]).toEqual({ key: 'id', value: 'LOG-4711' });
        expect(entries).toContainEqual({ key: 'riskClass', value: 'ClassC' });
        // Enum references are shown unqualified
        expect(entries).toContainEqual({ key: 'interfaceKind', value: 'digitalSignal' });
    });

    it('skips prose, nested query attributes, and over-long values, and caps the row count', () => {
        const entries = pickCompartmentEntries(el('x', {
            attributes: {
                'selectionQuery.includeLayers': 'a,b',
                longDescription: 'prose',
                tooLong: 'x'.repeat(40),
                a1: 'v1', a2: 'v2', a3: 'v3', a4: 'v4', a5: 'v5',
            },
        }));
        expect(entries.map(e => e.key)).toEqual(['a1', 'a2', 'a3', 'a4']);
    });
});
