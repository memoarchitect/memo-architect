// ─── Browser template tests (KK-8 membership tree logic) ────────────────────

import { describe, it, expect } from 'vitest';
import type { MemoElement, MemoRelationship } from '@memoarchitect/tools/browser';
import { buildBrowserTree, filterBrowserTree, kindInitials } from '../browser-view';

function el(id: string, overrides: Partial<MemoElement> = {}): MemoElement {
    return {
        id,
        name: id,
        kind: 'LogicalFunction',
        construct: 'part',
        layer: 'functions',
        file: 'test.sysml',
        attributes: {},
        package: 'memo::examples::gpca::behavior_subsystems',
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

describe('buildBrowserTree', () => {
    it('hangs composition roots under their package and nests children', () => {
        const roots = buildBrowserTree(
            [el('device'), el('sensors'), el('airSensor')],
            [rel('composes', 'device', 'sensors'), rel('composes', 'sensors', 'airSensor')],
        );
        expect(roots).toHaveLength(1);
        expect(roots[0].id).toBe('pkg:memo::examples::gpca::behavior_subsystems');
        expect(roots[0].label).toBe('behavior_subsystems');
        expect(roots[0].count).toBe(3);
        const device = roots[0].children[0];
        expect(device.id).toBe('device');
        expect(device.children.map(c => c.id)).toEqual(['sensors']);
        expect(device.children[0].children.map(c => c.id)).toEqual(['airSensor']);
    });

    it('groups large heterogeneous packages by kind', () => {
        const members = [
            ...Array.from({ length: 6 }, (_, i) => el(`fn${i}`, { kind: 'LogicalFunction' })),
            ...Array.from({ length: 4 }, (_, i) => el(`dd${i}`, { kind: 'DataDefinition' })),
        ];
        const roots = buildBrowserTree(members, []);
        const pkg = roots[0];
        expect(pkg.children.map(c => c.label)).toEqual(['DataDefinition', 'LogicalFunction']);
        expect(pkg.children[0].count).toBe(4);
        expect(pkg.children[1].count).toBe(6);
    });

    it('keeps small or homogeneous packages flat', () => {
        const roots = buildBrowserTree([el('a'), el('b')], []);
        expect(roots[0].children.map(c => c.id)).toEqual(['a', 'b']);
    });
});

describe('filterBrowserTree', () => {
    it('keeps matches plus their ancestors and expands the path', () => {
        const roots = buildBrowserTree(
            [el('device'), el('sensors'), el('airSensor')],
            [rel('composes', 'device', 'sensors'), rel('composes', 'sensors', 'airSensor')],
        );
        const f = filterBrowserTree(roots, 'airsensor')!;
        expect(f.visible.has('airSensor')).toBe(true);
        expect(f.visible.has('sensors')).toBe(true);
        expect(f.visible.has('device')).toBe(true);
        expect(f.expanded.has('device')).toBe(true);
        expect(f.expanded.has('sensors')).toBe(true);
    });

    it('matches on kind too, and returns undefined for an empty query', () => {
        const roots = buildBrowserTree([el('x', { kind: 'DataDefinition' })], []);
        expect(filterBrowserTree(roots, 'datadef')!.visible.has('x')).toBe(true);
        expect(filterBrowserTree(roots, '  ')).toBeUndefined();
    });
});

describe('kindInitials', () => {
    it('takes the first two capitals, falling back to the first two letters', () => {
        expect(kindInitials('LogicalFunction')).toBe('LF');
        expect(kindInitials('DataDefinition')).toBe('DD');
        expect(kindInitials('port')).toBe('PO');
        expect(kindInitials(undefined)).toBe('·');
    });
});
