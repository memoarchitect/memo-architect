// ─── Composition tree tests (KK-2/KK-3 template structure logic) ────────────

import { describe, it, expect } from 'vitest';
import type { MemoElement, MemoRelationship } from '@memoarchitect/tools/browser';
import {
    buildCompositionTree, collectTreeIds, containersBelowDepth, pickCompartmentEntries,
    COMPOSITION_REL_TYPES, validateSingleTree, isPortUsage, portCompartmentEntries,
    definitionIndex, definitionLevelElements, definitionLevelComposition,
    declaredSubject, subtreeOf, dominantRoot,

} from '../composition-tree';
import { generalViewFilter, hierarchyTypesFor } from '../general-view';

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

    it('accepts an authored hierarchy relation when a BDD declares one', () => {
        const tree = buildCompositionTree(
            [el('operate'), el('monitor')],
            [rel('includes', 'operate', 'monitor')],
            new Set(['includes']),
        );
        expect(tree.roots).toEqual(['operate']);
        expect(tree.childrenMap.get('operate')).toEqual(['monitor']);
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

describe('containersBelowDepth', () => {
    /**
     * The GPCA device interconnect shape: a device frame owning assemblies,
     * each of which owns leaves. The assemblies fold in the overview, leaving
     * the device frame and its immediate parts readable.
     */
    const gpcaTree = () => buildCompositionTree(
        ['device', 'sensors', 'airSensor', 'doorSensor', 'sw', 'tlm', 'alarm', 'board']
            .map(id => el(id)),
        [
            rel('composes', 'device', 'sensors'),
            rel('composes', 'device', 'sw'),
            rel('composes', 'device', 'board'),
            rel('composes', 'sensors', 'airSensor'),
            rel('composes', 'sensors', 'doorSensor'),
            rel('composes', 'sw', 'tlm'),
            rel('composes', 'sw', 'alarm'),
        ],
    );

    it('folds the immediate child containers while leaving the frame open', () => {
        expect(containersBelowDepth(gpcaTree(), 1).sort()).toEqual(['sensors', 'sw']);
    });

    it('folds the containers at and below the given depth, never the leaves', () => {
        // Depth 2 is the leaves below the assemblies, which own nothing.
        expect(containersBelowDepth(gpcaTree(), 2)).toEqual([]);
    });

    it('folds every container including the root at depth 0', () => {
        expect(containersBelowDepth(gpcaTree(), 0).sort()).toEqual(['device', 'sensors', 'sw']);
    });

    it('can fold a deeper container while leaving the overview open', () => {
        // device > sw > subsystem > module: `subsystem` sits at depth 2.
        const tree = buildCompositionTree(
            ['device', 'sw', 'subsystem', 'module'].map(id => el(id)),
            [
                rel('composes', 'device', 'sw'),
                rel('composes', 'sw', 'subsystem'),
                rel('composes', 'subsystem', 'module'),
            ],
        );
        expect(containersBelowDepth(tree, 2)).toEqual(['subsystem']);
    });

    it('terminates on a composition cycle', () => {
        const tree = buildCompositionTree(
            ['a', 'b'].map(id => el(id)),
            [rel('composes', 'a', 'b'), rel('composes', 'b', 'a')],
        );
        expect(() => containersBelowDepth(tree, 2)).not.toThrow();
    });
});

// ─── Ports are features of a block, not boxes beside it ─────────────────────

const port = (id: string, owner: string, type: string): MemoElement =>
    el(id, { construct: 'port', kind: type, owner, portSpec: { type: `pkg::${type}`, isConjugated: false } });

describe('isPortUsage', () => {
    it('is asked of construct, not of the kind name', () => {
        expect(isPortUsage(port('p1', 'ciu', 'PhysicalPort'))).toBe(true);
        // A kind whose NAME ends in "Port" but which is a part is still a part.
        expect(isPortUsage(el('panel', { kind: 'InterfacePanelPort' }))).toBe(false);
    });

    it('admits a port DEFINITION as a node — a def is a block, a usage is a feature', () => {
        expect(isPortUsage(el('PhysicalPort', { construct: 'port', isDefinition: true }))).toBe(false);
    });
});

describe('generalViewFilter', () => {
    it('drops port usages and keeps everything else', () => {
        const elements = [el('ciu'), port('p1', 'ciu', 'PhysicalPort'), el('board')];
        expect(elements.filter(generalViewFilter()).map(e => e.id)).toEqual(['ciu', 'board']);
    });

    it('composes with the view own filter rather than replacing it', () => {
        const elements = [el('ciu'), port('p1', 'ciu', 'PhysicalPort'), el('board')];
        const onlyCiu = generalViewFilter(e => e.id === 'ciu' || e.id === 'p1');
        expect(elements.filter(onlyCiu).map(e => e.id)).toEqual(['ciu']);
    });
});

describe('portCompartmentEntries', () => {
    const model = (els: MemoElement[]) =>
        ({ elements: Object.fromEntries(els.map(e => [e.id, e])), relationships: [] }) as never;

    it('lists an owner ports as name : type rows', () => {
        const p1 = port('toPatient', 'ciu', 'PatientAppliedPort');
        const owner = el('ciu', { ownedPorts: ['toPatient'] });
        expect(portCompartmentEntries(owner, model([owner, p1])))
            .toEqual([{ key: 'toPatient', value: 'PatientAppliedPort' }]);
    });

    it('is empty for a block that declares no ports', () => {
        const owner = el('board');
        expect(portCompartmentEntries(owner, model([owner]))).toEqual([]);
    });

    it('counts the remainder instead of silently truncating', () => {
        const ports = Array.from({ length: 9 }, (_, i) => port(`p${i}`, 'ciu', 'PhysicalPort'));
        const owner = el('ciu', { ownedPorts: ports.map(p => p.id) });
        const rows = portCompartmentEntries(owner, model([owner, ...ports]), 6);
        expect(rows).toHaveLength(7);
        expect(rows[6]).toEqual({ key: '', value: '+3 more ports' });
    });
});

// ─── Only composition makes a parent ─────────────────────────────────────────

describe('hierarchyTypesFor', () => {
    it('keeps the composition types a view declares and drops the rest', () => {
        // The IMS physical decomposition view declares exactly this pair.
        expect([...hierarchyTypesFor(['composes', 'memoLink'])!]).toEqual(['composes']);
    });

    it('lets a view narrow to one composition type', () => {
        expect([...hierarchyTypesFor(['aggregation'])!]).toEqual(['aggregation']);
    });

    it('falls back to every composition type when a view declares none', () => {
        // "Draw flows" is not a statement that the view has no hierarchy.
        expect(hierarchyTypesFor(['flow', 'memoLink'])).toBeUndefined();
        expect(hierarchyTypesFor([])).toBeUndefined();
        expect(hierarchyTypesFor(undefined)).toBeUndefined();
    });

    it('never lets a declared type widen the hierarchy beyond composition', () => {
        for (const t of hierarchyTypesFor(['composes', 'flow', 'memoLink', 'satisfies'])!) {
            expect(COMPOSITION_REL_TYPES.has(t)).toBe(true);
        }
    });
});

describe('buildCompositionTree with a non-composition type', () => {
    it('does not let memoLink invent a parent', () => {
        const elements = [el('ciu'), el('board')];
        const rels = [rel('memoLink', 'ciu', 'board')];
        const viaBoth = buildCompositionTree(elements, rels, new Set(['composes', 'memoLink']));
        expect(viaBoth.roots).toEqual(['ciu']);          // today's behaviour
        const viaComposition = buildCompositionTree(elements, rels, hierarchyTypesFor(['composes', 'memoLink']));
        expect(viaComposition.roots).toEqual(['ciu', 'board']);  // both roots: no composition edge exists
    });
});


// ─── A BDD is a diagram of definitions, and of one subject ──────────────────

const def = (id: string, name = id) => el(id, { name, isDefinition: true });
const use = (id: string, type: string) => el(id, { attributes: { usageType: type } });
const index = (els: MemoElement[]) => definitionIndex(Object.fromEntries(els.map(e => [e.id, e])));
const record = (els: MemoElement[]) => Object.fromEntries(els.map(e => [e.id, e]));

describe('definitionLevelElements', () => {
    it('maps usages to the definitions that type them, deduplicated', () => {
        const els = [use('daq1', 'Board'), use('daq2', 'Board'), def('Board')];
        expect(definitionLevelElements(els, index(els)).map(e => e.id)).toEqual(['Board']);
    });

    it('keeps an element whose type cannot be resolved rather than dropping it', () => {
        const els = [use('orphan', 'Missing')];
        expect(definitionLevelElements(els, index(els)).map(e => e.id)).toEqual(['orphan']);
    });
});

describe('definitionLevelComposition', () => {
    it('reads composition declared on the usage and on the definition alike', () => {
        // catheterInterfaceUnit (usage) composes daqBoard (usage) : Board
        const els = [def('CIU'), use('ciu', 'CIU'), def('Board'), use('daqBoard', 'Board')];
        const rels = [rel('composes', 'ciu', 'daqBoard')];
        const out = definitionLevelComposition(rels, record(els), index(els));
        expect(out.map(r => [r.sourceId, r.targetId])).toEqual([['CIU', 'Board']]);
    });

    it('states a repeated part once — how many is multiplicity, not more edges', () => {
        const els = [def('CIU'), use('ciu', 'CIU'), def('Board'), use('b1', 'Board'), use('b2', 'Board')];
        const rels = [rel('composes', 'ciu', 'b1'), rel('composes', 'ciu', 'b2')];
        expect(definitionLevelComposition(rels, record(els), index(els))).toHaveLength(1);
    });

    it('drops an edge that becomes a self-loop once both ends resolve', () => {
        const els = [def('Board'), use('b', 'Board')];
        const rels = [rel('composes', 'Board', 'b')];
        expect(definitionLevelComposition(rels, record(els), index(els))).toEqual([]);
    });
});

describe('declaredSubject', () => {
    const els = [def('CatheterInterfaceUnit', 'CIU'), el('other')];

    it('takes the specifically exposed element, not the wildcard scope', () => {
        const subject = declaredSubject(
            { expose: 'pkg_ciu::CatheterInterfaceUnit, pkg_ims::*' }, record(els));
        expect(subject?.id).toBe('CatheterInterfaceUnit');
    });

    it('ignores a wildcard-only expose', () => {
        expect(declaredSubject({ expose: 'pkg_ims::*' }, record(els))).toBeUndefined();
    });

    it('falls back to includeElementIds, matched on providedId', () => {
        const tagged = [el('hw', { attributes: { providedId: 'HW-IMS-01' } })];
        const subject = declaredSubject(
            { 'selectionQuery.includeElementIds': 'HW-IMS-01' }, record(tagged));
        expect(subject?.id).toBe('hw');
    });
});

describe('subtreeOf', () => {
    it('keeps what the subject reaches and drops the rest', () => {
        const els = [el('ciu'), el('board'), el('fpga'), el('unrelated')];
        const rels = [rel('composes', 'ciu', 'board'), rel('composes', 'board', 'fpga')];
        const sub = subtreeOf(buildCompositionTree(els, rels), 'ciu');
        expect(sub.roots).toEqual(['ciu']);
        expect([...sub.elements.keys()].sort()).toEqual(['board', 'ciu', 'fpga']);
    });

    it('returns the tree untouched when the root is not in it', () => {
        const els = [el('a')];
        const tree = buildCompositionTree(els, []);
        expect(subtreeOf(tree, 'nope')).toBe(tree);
    });
});

describe('dominantRoot', () => {
    it('picks the root that reaches the most of the diagram', () => {
        const els = [el('big'), el('c1'), el('c2'), el('lonely')];
        const rels = [rel('composes', 'big', 'c1'), rel('composes', 'big', 'c2')];
        expect(dominantRoot(buildCompositionTree(els, rels))).toBe('big');
    });
});
