import { describe, expect, it } from 'vitest';
import {
    collectNodeIds,
    computeHierarchicalDSM,
    defaultContainmentTypes,
    flattenAxis,
    layersInModel,
    suggestDsmLayer,
    suggestTraceLayers,
} from './dsm-hierarchy';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';

const element = (id: string, kind: string, layer: string, pkg?: string) => ({
    id, name: id, kind, layer, construct: 'part', file: 'model.sysml',
    attributes: {}, package: pkg,
});

const rel = (id: string, type: string, sourceId: string, targetId: string) => ({
    id, type, sourceId, targetId, sourceEnd: '', targetEnd: '', file: 'model.sysml',
});

/**
 * A two-axis model: an architecture tree (System → Subsystem → Component) on
 * one side, a function tree on the other, joined by allocation and flow.
 */
const model: MemoModelDTO = {
    errors: [],
    elements: {
        sys: element('sys', 'System', 'logical', 'Arch'),
        subA: element('subA', 'Subsystem', 'logical', 'Arch'),
        subB: element('subB', 'Subsystem', 'logical', 'Arch'),
        compA1: element('compA1', 'Component', 'logical', 'Arch'),
        compA2: element('compA2', 'Component', 'logical', 'Arch'),
        compB1: element('compB1', 'Component', 'logical', 'Arch'),
        fnTop: element('fnTop', 'Function', 'functional', 'Fn'),
        fnA: element('fnA', 'Function', 'functional', 'Fn'),
        fnB: element('fnB', 'Function', 'functional', 'Fn'),
    },
    relationships: [
        rel('c1', 'composes', 'sys', 'subA'),
        rel('c2', 'composes', 'sys', 'subB'),
        rel('c3', 'composes', 'subA', 'compA1'),
        rel('c4', 'composes', 'subA', 'compA2'),
        rel('c5', 'composes', 'subB', 'compB1'),
        rel('c6', 'composes', 'fnTop', 'fnA'),
        rel('c7', 'composes', 'fnTop', 'fnB'),
        rel('f1', 'flow', 'compA1', 'compB1'),
        rel('f2', 'flow', 'compA2', 'compA1'),
        rel('a1', 'allocateTo', 'fnA', 'compA1'),
        rel('a2', 'allocateTo', 'fnB', 'compB1'),
    ],
};

describe('containment discovery', () => {
    it('offers only the containment types the model actually declares', () => {
        expect(defaultContainmentTypes(model)).toEqual(['composes']);
    });
});

describe('hierarchical axes', () => {
    it('nests elements under their composition parent', () => {
        const dsm = computeHierarchicalDSM(model, { columns: { kinds: ['System', 'Subsystem', 'Component'] } });
        const roots = dsm.columnRoots.map(node => node.id);
        expect(roots).toContain('sys');
        const sys = dsm.columnRoots.find(node => node.id === 'sys')!;
        expect(sys.children.map(node => node.id)).toEqual(['subA', 'subB']);
        expect(sys.members.sort()).toEqual(['compA1', 'compA2', 'compB1', 'subA', 'subB', 'sys']);
    });

    it('keeps a non-matching ancestor so its matching parts stay reachable', () => {
        const dsm = computeHierarchicalDSM(model, { rows: { kinds: ['Component'] } });
        const sys = dsm.rowRoots.find(node => node.id === 'sys');
        expect(sys, 'the System is kept as a structural line').toBeDefined();
        expect(collectNodeIds(dsm.rowRoots)).toEqual(expect.arrayContaining(['sys', 'subA', 'subB']));
    });

    it('shows only the roots until a node is expanded', () => {
        const collapsed = flattenAxis(
            computeHierarchicalDSM(model, { rows: { kinds: ['System', 'Subsystem', 'Component'] } }).rowRoots,
            new Set(),
        );
        expect(collapsed.filter(entry => entry.node.id === 'subA')).toHaveLength(0);

        const expanded = flattenAxis(
            computeHierarchicalDSM(model, { rows: { kinds: ['System', 'Subsystem', 'Component'] } }).rowRoots,
            new Set(['sys']),
        );
        expect(expanded.map(entry => entry.node.id)).toContain('subA');
        expect(expanded.find(entry => entry.node.id === 'subA')!.depth).toBe(1);
    });
});

describe('dependency roll-up', () => {
    const axes = {
        rows: { kinds: ['System', 'Subsystem', 'Component'] },
        columns: { kinds: ['System', 'Subsystem', 'Component'] },
        dependencyTypes: ['flow'],
    };

    it('sums a collapsed subtree into one cell', () => {
        const dsm = computeHierarchicalDSM(model, { ...axes, rows: { ...axes.rows, expanded: new Set(['sys']) }, columns: { ...axes.columns, expanded: new Set(['sys']) } });
        const rowOf = (id: string) => dsm.rows.findIndex(entry => entry.node.id === id);
        const colOf = (id: string) => dsm.columns.findIndex(entry => entry.node.id === id);

        // compA1 → compB1 rolls up to subA → subB while both stay collapsed.
        const cell = dsm.matrix[rowOf('subA')][colOf('subB')];
        expect(cell?.strength).toBe(1);
        expect(cell?.aggregated).toBe(true);

        // compA2 → compA1 is internal to subA, so it lands on the diagonal.
        const diagonal = dsm.matrix[rowOf('subA')][colOf('subA')];
        expect(diagonal?.diagonal).toBe(true);
        expect(diagonal?.strength).toBe(1);
    });

    it('resolves to the exact pair once both ends are expanded', () => {
        const expanded = new Set(['sys', 'subA', 'subB']);
        const dsm = computeHierarchicalDSM(model, {
            ...axes,
            rows: { ...axes.rows, expanded },
            columns: { ...axes.columns, expanded },
        });
        const rowOf = (id: string) => dsm.rows.findIndex(entry => entry.node.id === id);
        const colOf = (id: string) => dsm.columns.findIndex(entry => entry.node.id === id);
        const cell = dsm.matrix[rowOf('compA1')][colOf('compB1')];
        expect(cell?.strength).toBe(1);
        expect(cell?.aggregated).toBe(false);
        expect(cell?.relationshipIds).toEqual(['f1']);
    });

    it('never counts a containment relationship as a dependency', () => {
        const dsm = computeHierarchicalDSM(model, {
            rows: { kinds: ['Component'], expanded: new Set(collectNodeIds(computeHierarchicalDSM(model, {}).rowRoots)) },
            columns: { kinds: ['Component'] },
        });
        expect(dsm.matrix.flat().flatMap(cell => cell?.types ?? [])).not.toContain('composes');
    });
});

describe('asymmetric axes', () => {
    it('puts functions on the rows and architecture on the columns', () => {
        const dsm = computeHierarchicalDSM(model, {
            rows: { kinds: ['Function'], expanded: new Set(['fnTop']) },
            columns: { kinds: ['System', 'Subsystem', 'Component'], expanded: new Set(['sys', 'subA', 'subB']) },
            dependencyTypes: ['allocateTo'],
        });
        expect(dsm.rows.map(entry => entry.node.id)).toEqual(['fnTop', 'fnA', 'fnB']);
        const colOf = (id: string) => dsm.columns.findIndex(entry => entry.node.id === id);
        expect(dsm.matrix[1][colOf('compA1')]?.strength).toBe(1);
        expect(dsm.matrix[2][colOf('compB1')]?.strength).toBe(1);
        expect(dsm.totalDependencies).toBe(2);
    });
});

describe('ordering', () => {
    it('sequences siblings so dependencies sit above the diagonal', () => {
        // compA2 → compA1, so partitioning must place compA2 first.
        const options = {
            rows: { kinds: ['Component'], expanded: new Set(['sys', 'subA', 'subB']) },
            columns: { kinds: ['Component'], expanded: new Set(['sys', 'subA', 'subB']) },
            dependencyTypes: ['flow'],
        };
        const natural = computeHierarchicalDSM(model, { ...options, ordering: 'natural' as const });
        const partitioned = computeHierarchicalDSM(model, { ...options, ordering: 'partition' as const });
        const order = (dsm: typeof natural) => dsm.rows.map(entry => entry.node.id);
        expect(order(natural).indexOf('compA1')).toBeLessThan(order(natural).indexOf('compA2'));
        expect(order(partitioned).indexOf('compA2')).toBeLessThan(order(partitioned).indexOf('compA1'));
        expect(partitioned.stats.feedback).toBeLessThanOrEqual(natural.stats.feedback);
    });
});

describe('element filtering', () => {
    it('narrows an axis to the chosen elements', () => {
        const dsm = computeHierarchicalDSM(model, {
            rows: { elementIds: ['compA1', 'compB1'], expanded: new Set(['sys', 'subA', 'subB']) },
            columns: { elementIds: ['compA1', 'compB1'], expanded: new Set(['sys', 'subA', 'subB']) },
            dependencyTypes: ['flow'],
        });
        // The chosen two are there, and compA2 — same kind, not chosen — is not.
        const shown = dsm.rows.map(entry => entry.node.id);
        expect(shown).toContain('compA1');
        expect(shown).toContain('compB1');
        expect(shown).not.toContain('compA2');
    });

    it('keeps the ancestors of a chosen element, so it stays reachable', () => {
        const dsm = computeHierarchicalDSM(model, { rows: { elementIds: ['compA1'] } });
        expect(collectNodeIds(dsm.rowRoots)).toEqual(expect.arrayContaining(['sys', 'subA']));
    });

    it('intersects with the kind filter rather than overriding it', () => {
        const dsm = computeHierarchicalDSM(model, {
            // fnA is a Function, so the Component kind filter excludes it even
            // though it was named.
            rows: { kinds: ['Component'], elementIds: ['compA1', 'fnA'], expanded: new Set(['sys', 'subA']) },
        });
        const shown = dsm.rows.map(entry => entry.node.id);
        expect(shown).toContain('compA1');
        expect(shown).not.toContain('fnA');
    });

    it('treats an empty pick as "every element the kinds allow"', () => {
        const all = computeHierarchicalDSM(model, { rows: { kinds: ['Component'] } });
        const explicit = computeHierarchicalDSM(model, { rows: { kinds: ['Component'], elementIds: [] } });
        expect(collectNodeIds(explicit.rowRoots)).toEqual(collectNodeIds(all.rowRoots));
    });

    it('still rolls a chosen parent up over parts that were not chosen', () => {
        // `sys` comes along as the ancestor holding the two chosen
        // subsystems, so it has to be expanded for them to be on screen.
        const dsm = computeHierarchicalDSM(model, {
            rows: { elementIds: ['subA', 'subB'], expanded: new Set(['sys']) },
            columns: { elementIds: ['subA', 'subB'], expanded: new Set(['sys']) },
            dependencyTypes: ['flow'],
        });
        const rowOf = (id: string) => dsm.rows.findIndex(entry => entry.node.id === id);
        const colOf = (id: string) => dsm.columns.findIndex(entry => entry.node.id === id);
        // compA1 → compB1 is between parts neither of which was chosen; the
        // chosen subsystems still carry it.
        expect(dsm.matrix[rowOf('subA')][colOf('subB')]?.strength).toBe(1);
    });
});

describe('semantic axes', () => {
    it('lists one layer, spanning the several kinds that make up its tree', () => {
        const dsm = computeHierarchicalDSM(model, {
            rows: { layer: 'logical', expanded: new Set(['sys', 'subA', 'subB']) },
        });
        const kinds = new Set(dsm.rows.map(entry => entry.node.kind));
        // System, Subsystem and Component are three kinds but one architecture.
        expect([...kinds].sort()).toEqual(['Component', 'Subsystem', 'System']);
        expect(dsm.rows.map(entry => entry.node.id)).not.toContain('fnA');
    });

    it('narrows to one kind inside a layer when asked', () => {
        const dsm = computeHierarchicalDSM(model, {
            rows: { layer: 'logical', kinds: ['Component'], expanded: new Set(['sys', 'subA', 'subB']) },
        });
        const leaves = dsm.rows.filter(entry => entry.node.children.length === 0);
        expect(leaves.every(entry => entry.node.kind === 'Component')).toBe(true);
    });

    it('never lets one axis mix two layers', () => {
        const dsm = computeHierarchicalDSM(model, { rows: { layer: 'functional' } });
        const layers = new Set(dsm.rows.map(entry => entry.node.layer));
        expect([...layers]).toEqual(['functional']);
    });
});

describe('suggested defaults', () => {
    it('opens the DSM on the layer whose elements depend on each other', () => {
        // Only the logical layer has internal flow in this model.
        expect(suggestDsmLayer(model)).toBe('logical');
    });

    it('opens traceability on the busiest crossing between two layers', () => {
        expect(suggestTraceLayers(model)).toEqual({ rows: 'functional', columns: 'logical' });
    });

    it('falls back to a single layer when nothing crosses', () => {
        const isolated: MemoModelDTO = {
            ...model,
            relationships: model.relationships.filter(rel => rel.type !== 'allocateTo'),
        };
        expect(suggestTraceLayers(isolated)).toEqual({ rows: 'logical', columns: 'logical' });
    });

    it('summarises the layers a model populates, largest first', () => {
        const summary = layersInModel(model);
        expect(summary.map(entry => entry.layer)).toEqual(['logical', 'functional']);
        expect(summary[0].kinds.map(entry => entry.kind)).toEqual(['Component', 'Subsystem', 'System']);
        expect(summary[0].elementCount).toBe(6);
    });
});

describe('package grouping', () => {
    it('wraps roots in their package', () => {
        const dsm = computeHierarchicalDSM(model, { groupByPackage: true, rows: { kinds: ['Function'] } });
        expect(dsm.rowRoots.map(node => node.id)).toEqual(['pkg:Fn']);
        expect(dsm.rowRoots[0].isElement).toBe(false);
        expect(dsm.rowRoots[0].children.map(node => node.id)).toEqual(['fnTop']);
    });
});
