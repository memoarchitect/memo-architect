// ─── Grid template tests (KK-7 data preparation) ────────────────────────────

import { describe, it, expect } from 'vitest';
import type { MemoElement, MemoRelationship } from '@memo/tools/browser';
import { buildGridTable, buildGridMatrix, sortSection, pickColumns } from '../grid-view';

function el(id: string, overrides: Partial<MemoElement> = {}): MemoElement {
    return {
        id,
        name: id,
        kind: 'FailureMode',
        construct: 'part',
        layer: 'analysis',
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

const fm = (id: string, rpn: number, crit: string) => el(id, {
    attributes: {
        severityRating: '10', rpn: String(rpn),
        criticality: `CriticalityKind::${crit}`,
        description: 'long prose that must not become a column',
    },
});

describe('buildGridTable', () => {
    it('groups rows into per-kind sections, dominant kind first', () => {
        const sections = buildGridTable([
            fm('fm1', 60, 'catastrophic'),
            fm('fm2', 120, 'high'),
            el('ws', { kind: 'FMEAWorksheet', attributes: { scope: 'GPCA' } }),
        ]);
        expect(sections.map(s => s.kind)).toEqual(['FailureMode', 'FMEAWorksheet']);
        expect(sections[0].rows).toHaveLength(2);
    });

    it('derives columns from attributes, skipping prose, and unqualifies enums', () => {
        const sections = buildGridTable([fm('fm1', 60, 'catastrophic')]);
        const s = sections[0];
        expect(s.columns).toContain('rpn');
        expect(s.columns).toContain('criticality');
        expect(s.columns).not.toContain('description');
        const critIdx = s.columns.indexOf('criticality');
        expect(s.rows[0].values[critIdx]).toBe('catastrophic');
    });

    it('marks numeric columns for numeric-aware sorting', () => {
        const s = buildGridTable([fm('a', 60, 'x'), fm('b', 112, 'y')])[0];
        const rpnIdx = s.columns.indexOf('rpn');
        const critIdx = s.columns.indexOf('criticality');
        expect(s.numeric[rpnIdx]).toBe(true);
        expect(s.numeric[critIdx]).toBe(false);
        // 112 > 60 numerically but '112' < '60' lexically — numeric wins
        const sorted = sortSection(s, rpnIdx, 'desc');
        expect(sorted.map(r => r.element.id)).toEqual(['b', 'a']);
    });

    it('sorts by element name for column -1 and sinks empty cells', () => {
        const s = buildGridTable([
            el('b', { attributes: { rpn: '5' } }),
            el('a', { attributes: {} }),
        ])[0];
        expect(sortSection(s, -1, 'asc').map(r => r.element.id)).toEqual(['a', 'b']);
        const rpnIdx = s.columns.indexOf('rpn');
        expect(sortSection(s, rpnIdx, 'asc').map(r => r.element.id)).toEqual(['b', 'a']);
    });
});

describe('pickColumns', () => {
    it('caps at 7 frequency-ranked columns', () => {
        const attrs: Record<string, string> = {};
        for (let i = 0; i < 12; i++) attrs[`a${i}`] = 'v';
        expect(pickColumns([el('x', { attributes: attrs })])).toHaveLength(7);
    });
});

describe('buildGridMatrix', () => {
    const fn = el('fn1', { kind: 'LogicalFunction' });
    const sw = el('sw1', { kind: 'SoftwareComponent' });
    const hw = el('hw1', { kind: 'HardwareAssembly' });

    it('builds rows from sources and columns from targets', () => {
        const m = buildGridMatrix(
            [fn, sw, hw],
            [rel('allocatedTo', 'fn1', 'sw1'), rel('allocatedTo', 'fn1', 'hw1')],
        );
        expect(m).toBeDefined();
        expect(m!.rows.map(r => r.id)).toEqual(['fn1']);
        expect(m!.cols.map(c => c.id).sort()).toEqual(['hw1', 'sw1']);
        expect(m!.cells.get('fn1|sw1')).toEqual(['allocatedTo']);
        expect(m!.relTypes).toEqual(['allocatedTo']);
    });

    it('honors declared relationship types and drops external edges', () => {
        const m = buildGridMatrix(
            [fn, sw],
            [
                rel('allocatedTo', 'fn1', 'sw1'),
                rel('traceTo', 'fn1', 'sw1'),
                rel('allocatedTo', 'fn1', 'external'),
            ],
            ['AllocatedTo'],
        );
        expect(m!.cells.get('fn1|sw1')).toEqual(['allocatedTo']);
        expect(m!.relTypes).toEqual(['allocatedTo']);
    });

    it('returns undefined when nothing qualifies', () => {
        expect(buildGridMatrix([fn], [rel('allocatedTo', 'x', 'y')])).toBeUndefined();
    });
});
