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

    it('reads the entries nested under the legend', () => {
        const { legend, l0, l1, rels } = levelLegend();
        const view = el('view', { legend: 'levels' });
        const resolved = resolveLegend(view, modelOf([legend, l0, l1], rels))!;
        expect(resolved.name).toBe('Function level');
        expect(resolved.attributeName).toBe('level');
        expect(resolved.entries).toEqual([
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

    it('colours only the constructs it applies to', () => {
        const { legend, l0, l1, rels } = levelLegend();
        legend.attributes.appliesTo = 'LegendScopeKind::connection';
        const view = el('view', { legend: 'levels' });
        const resolved = resolveLegend(view, modelOf([legend, l0, l1], rels))!;
        expect(resolved.colorFor(el('a', { level: 'L0' }, 'part'))).toBeUndefined();
        expect(resolved.colorFor(el('b', { level: 'L0' }, 'connection'))).toBe('#111111');
    });

    it('is nothing when the legend has no usable entries', () => {
        const legend = el('empty', { attributeName: 'level' });
        const noColor = el('e', { value: 'L0' });
        const view = el('view', { legend: 'empty' });
        expect(resolveLegend(view, modelOf([legend, noColor], [composes('empty', 'e')]))).toBeUndefined();
    });

    it('can be tied to the element kind, which is a field not an attribute', () => {
        const legend = el('kinds', { attributeName: 'kind' });
        const entry = el('e', { value: 'SystemFunction', color: '#1B3A4B' });
        const view = el('view', { legend: 'kinds' });
        const resolved = resolveLegend(view, modelOf([legend, entry], [composes('kinds', 'e')]))!;
        const fn = { ...el('a'), kind: 'SystemFunction' } as MemoElement;
        const other = { ...el('b'), kind: 'ComponentFunction' } as MemoElement;
        expect(resolved.colorFor(fn)).toBe('#1B3A4B');
        expect(resolved.colorFor(other)).toBeUndefined();
    });

    it('resolves a qualified reference by its last segment', () => {
        const { legend, l0, l1, rels } = levelLegend();
        const view = el('view', { legend: 'pkg::levels' });
        expect(resolveLegend(view, modelOf([legend, l0, l1], rels))?.id).toBe('levels');
    });
});
