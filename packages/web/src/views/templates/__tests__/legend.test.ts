// ─── Legend resolution ───────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import type { MemoElement, MemoModelDTO, MemoRelationship } from '@memoarchitect/tools/browser';
import { resolveLegend } from '../legend';

const el = (id: string, attributes: Record<string, string> = {}, construct = 'part'): MemoElement => ({
    id, name: id, kind: 'X', construct, layer: 'l', file: 'f.sysml', attributes,
} as MemoElement);

const composes = (source: string, target: string): MemoRelationship => ({
    id: `r-${source}-${target}`, type: 'composes', sourceId: source, targetId: target,
    sourceEnd: '', targetEnd: '', file: 'f.sysml',
} as MemoRelationship);

const modelOf = (els: MemoElement[], rels: MemoRelationship[] = []) =>
    ({ elements: Object.fromEntries(els.map(e => [e.id, e])), relationships: rels }) as unknown as MemoModelDTO;

/** A legend on `level`, with two entries. */
const levelLegend = () => {
    const legend = el('levels', { attributeName: 'level', name: 'Function level' });
    const l0 = el('e0', { value: 'L0', color: '#111111', label: 'Level 0' });
    const l1 = el('e1', { value: 'L1', color: '#222222' });
    return { legend, l0, l1, rels: [composes('levels', 'e0'), composes('levels', 'e1')] };
};

describe('resolveLegend', () => {
    it('is nothing when the view names no legend', () => {
        expect(resolveLegend(el('view'), modelOf([]))).toBeUndefined();
    });

    it('reads the swatches nested under the legend', () => {
        const { legend, l0, l1, rels } = levelLegend();
        const view = el('view', { legend: 'levels' });
        const resolved = resolveLegend(view, modelOf([legend, l0, l1], rels))!;
        expect(resolved.name).toBe('Function level');
        expect(resolved.attributeName).toBe('level');
        expect(resolved.swatches).toEqual([
            { value: 'L0', color: '#111111', label: 'Level 0' },
            { value: 'L1', color: '#222222', label: 'L1' },  // label falls back to the value
        ]);
    });

    it('colours an element by the value of the attribute it is tied to', () => {
        const { legend, l0, l1, rels } = levelLegend();
        const view = el('view', { legend: 'levels' });
        const resolved = resolveLegend(view, modelOf([legend, l0, l1], rels))!;
        expect(resolved.colorFor(el('a', { level: 'L0' }))).toBe('#111111');
        expect(resolved.colorFor(el('b', { level: 'L1' }))).toBe('#222222');
        // A value the legend does not name is left alone, not given a colour.
        expect(resolved.colorFor(el('c', { level: 'L9' }))).toBeUndefined();
        expect(resolved.colorFor(el('d'))).toBeUndefined();
    });

    it('follows an enumeration wherever the model put it', () => {
        const legend = el('stages', { enumerationName: 'StageKind' });
        const entry = el('e', { value: 'concept', color: '#333333' });
        const view = el('view', { legend: 'stages' });
        const resolved = resolveLegend(view, modelOf([legend, entry], [composes('stages', 'e')]))!;
        expect(resolved.colorFor(el('a', { realizationStage: 'StageKind::concept' }))).toBe('#333333');
        // A different enum's value of the same name is not this legend's.
        expect(resolved.colorFor(el('b', { other: 'OtherKind::concept' }))).toBeUndefined();
    });

    it('maps a plural scope to the construct it scopes', () => {
        // `part` and friends are SysML keywords, so the literals are plural.
        const { legend, l0, l1, rels } = levelLegend();
        legend.attributes.appliesTo = 'LegendScopeKind::parts';
        const view = el('view', { legend: 'levels' });
        const resolved = resolveLegend(view, modelOf([legend, l0, l1], rels))!;
        expect(resolved.colorFor(el('a', { level: 'L0' }, 'part'))).toBe('#111111');
        expect(resolved.colorFor(el('b', { level: 'L0' }, 'action'))).toBeUndefined();
    });

    it('colours only the constructs it applies to', () => {
        const { legend, l0, l1, rels } = levelLegend();
        legend.attributes.appliesTo = 'LegendScopeKind::connections';
        const view = el('view', { legend: 'levels' });
        const resolved = resolveLegend(view, modelOf([legend, l0, l1], rels))!;
        expect(resolved.colorFor(el('a', { level: 'L0' }, 'part'))).toBeUndefined();
        expect(resolved.colorFor(el('b', { level: 'L0' }, 'connection'))).toBe('#111111');
    });

    it('is nothing when the legend has no usable swatches', () => {
        const legend = el('empty', { attributeName: 'level' });
        const noColor = el('e', { value: 'L0' });
        const view = el('view', { legend: 'empty' });
        expect(resolveLegend(view, modelOf([legend, noColor], [composes('empty', 'e')]))).toBeUndefined();
    });

    it('can be tied to the element kind, which is a field not an attribute', () => {
        const legend = el('kinds', { derivedFrom: 'LegendSourceKind::elementKind' });
        const entry = el('e', { value: 'SystemFunction', color: '#1B3A4B' });
        const view = el('view', { legend: 'kinds' });
        const resolved = resolveLegend(view, modelOf([legend, entry], [composes('kinds', 'e')]))!;
        expect(resolved.colorFor({ ...el('a'), kind: 'SystemFunction' } as MemoElement)).toBe('#1B3A4B');
        expect(resolved.colorFor({ ...el('b'), kind: 'ComponentFunction' } as MemoElement)).toBeUndefined();
    });

    it('can be tied to depth in the hierarchy — what L0/L1/L2 actually means', () => {
        const legend = el('levels', { derivedFrom: 'LegendSourceKind::hierarchyDepth' });
        const l0 = el('e0', { value: '0', label: 'L0', color: '#B45309' });
        const l1 = el('e1', { value: '1', label: 'L1', color: '#0F766E' });
        const view = el('view', { legend: 'levels' });
        const resolved = resolveLegend(view,
            modelOf([legend, l0, l1], [composes('levels', 'e0'), composes('levels', 'e1')]))!;
        expect(resolved.derivedFrom).toBe('hierarchyDepth');
        expect(resolved.colorFor(el('root'), { depth: 0 })).toBe('#B45309');
        expect(resolved.colorFor(el('child'), { depth: 1 })).toBe('#0F766E');
        // A depth the legend does not name, and a caller that supplies none.
        expect(resolved.colorFor(el('deep'), { depth: 7 })).toBeUndefined();
        expect(resolved.colorFor(el('unknown'))).toBeUndefined();
    });

    it('reads the level from the tree, not from an id that happens to spell it', () => {
        const legend = el('levels', { derivedFrom: 'LegendSourceKind::hierarchyDepth' });
        const entry = el('e0', { value: '0', color: '#B45309' });
        const view = el('view', { legend: 'levels' });
        const resolved = resolveLegend(view, modelOf([legend, entry], [composes('levels', 'e0')]))!;
        // Its id says L00; it sits at depth 1. Depth wins, because a rename or
        // a re-parent must not silently change what the colour claims.
        const misnamed = el('x', { providedId: 'FNC-AFF-L00-001' });
        expect(resolved.colorFor(misnamed, { depth: 1 })).toBeUndefined();
        expect(resolved.colorFor(misnamed, { depth: 0 })).toBe('#B45309');
    });

    it('resolves a qualified reference by its last segment', () => {
        const { legend, l0, l1, rels } = levelLegend();
        const view = el('view', { legend: 'pkg::levels' });
        expect(resolveLegend(view, modelOf([legend, l0, l1], rels))?.id).toBe('levels');
    });
});
