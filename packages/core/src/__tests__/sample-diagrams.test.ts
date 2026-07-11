import { describe, it, expect } from 'vitest';
import { deriveSampleDiagrams, SAMPLE_DIAGRAM_ID_PREFIX } from '../model/sample-diagrams.js';
import type { MemoModel, MemoElement, MemoRelationship } from '../model/semantic.js';

function el(
    id: string, kind: string, layer: string, construct = 'part',
    attributes: Record<string, string> = {}, owner?: string,
): MemoElement {
    return { id, name: id, kind, construct, layer, file: 'test.sysml', attributes, owner } as MemoElement;
}

function rel(type: string, sourceId: string, targetId: string): MemoRelationship {
    return { type, sourceId, targetId } as MemoRelationship;
}

/** Assemble the minimal MemoModel surface deriveSampleDiagrams reads. */
function makeModel(elements: MemoElement[], relationships: MemoRelationship[]): MemoModel {
    const byId = new Map(elements.map(e => [e.id, e]));
    const byKind = new Map<string, MemoElement[]>();
    const byLayer = new Map<string, MemoElement[]>();
    for (const e of elements) {
        if (!byKind.has(e.kind)) byKind.set(e.kind, []);
        byKind.get(e.kind)!.push(e);
        if (!byLayer.has(e.layer)) byLayer.set(e.layer, []);
        byLayer.get(e.layer)!.push(e);
    }
    return {
        elements: byId,
        relationships,
        errors: [],
        elementsByKind: byKind,
        elementsByLayer: byLayer,
    } as unknown as MemoModel;
}

const RICH_MODEL = makeModel(
    [
        // composition forest → general (BDD) sample
        el('sys', 'Subsystem', 'system'),
        el('p1', 'Subsystem', 'system'), el('p2', 'Subsystem', 'system'),
        el('p3', 'Subsystem', 'system'),
        el('leaf1', 'Subsystem', 'system'),
        // boundary port owned by the context part → interconnection sample
        el('port1', 'FlowPort', 'interfaces', 'port', {}, 'sys'),
        // a second, smaller tree — forest keeps multiple roots
        el('rig', 'Subsystem', 'system'), el('rigArm', 'Subsystem', 'system'),
        // actions + items → actionflow
        el('a1', 'ActionDefinition', 'behavior', 'action'),
        el('a2', 'ActionUsage', 'behavior', 'action'),
        el('a3', 'ActionUsage', 'behavior', 'action'),
        el('i1', 'ItemDefinition', 'behavior', 'item'),
        // states → statetransition
        el('s1', 'OperationalMode', 'behavior'), el('s2', 'OperationalMode', 'behavior'),
        el('s3', 'ModeMachine', 'behavior'),
        // steps + owning chain → sequence
        el('st1', 'ScenarioStep', 'operational', 'part', { stepOrder: '1' }),
        el('st2', 'ScenarioStep', 'operational', 'part', { stepOrder: '2' }),
        el('st3', 'ScenarioStep', 'operational', 'part', { stepOrder: '3' }),
        el('chain1', 'FunctionalChain', 'operational'),
        // requirements: largest kind cohort → grid
        el('r1', 'SystemRequirement', 'requirements'), el('r2', 'SystemRequirement', 'requirements'),
        el('r3', 'SystemRequirement', 'requirements'), el('r4', 'SystemRequirement', 'requirements'),
        el('r5', 'SystemRequirement', 'requirements'), el('r6', 'SystemRequirement', 'requirements'),
        el('r7', 'SystemRequirement', 'requirements'), el('r8', 'SystemRequirement', 'requirements'),
    ],
    [
        // strict tree: sys → {p1, p2, p3}, p1 → leaf1; second root rig → rigArm
        rel('composedOf', 'sys', 'p1'), rel('composedOf', 'sys', 'p2'),
        rel('composedOf', 'sys', 'p3'), rel('composedOf', 'p1', 'leaf1'),
        rel('composedOf', 'rig', 'rigArm'),
        // flows inside sys: parts exchanging with each other and the boundary port
        rel('ExchangesWith', 'p1', 'p2'), rel('ExchangesWith', 'p2', 'p3'),
        rel('ExchangesWith', 'port1', 'p1'),
        rel('IncludesStep', 'chain1', 'st1'), rel('IncludesStep', 'chain1', 'st2'),
        rel('IncludesStep', 'chain1', 'st3'),
    ],
);

describe('deriveSampleDiagrams', () => {
    const samples = deriveSampleDiagrams(RICH_MODEL);
    const byKind = new Map(samples.map(s => [s.viewKind, s]));

    it('emits one sample per renderable view kind, under the model viewpoint', () => {
        expect([...byKind.keys()].sort()).toEqual([
            'actionflow', 'general', 'grid', 'interconnection', 'sequence', 'statetransition',
        ]);
        for (const s of samples) {
            expect(s.id.startsWith(SAMPLE_DIAGRAM_ID_PREFIX)).toBe(true);
            expect(s.viewpointId).toBe('__model');
            expect(s.auto).toBe(true);
            expect(s.elementIds!.length).toBeGreaterThanOrEqual(3);
        }
    });

    it('does not emit a browser sample — the catalog owns that presentation', () => {
        expect(byKind.has('browser')).toBe(false);
    });

    it('general sample is the strict composition forest, largest tree first, opening as a tree', () => {
        const s = byKind.get('general')!;
        // DFS order: sys subtree (5) before the rig subtree (2); nothing else
        expect(s.elementIds).toEqual(['sys', 'p1', 'leaf1', 'p2', 'p3', 'rig', 'rigArm']);
        expect(s.properties?.layoutHint).toBe('tree');
        expect(s.properties?.modes).toBe('tree,containment');
    });

    it('interconnection sample selects one context block: its parts, owned ports, and connector types', () => {
        const s = byKind.get('interconnection')!;
        // context (sys) leads; family = descendants + owned port; no unrelated elements
        expect(s.elementIds![0]).toBe('sys');
        expect([...s.elementIds!].sort()).toEqual(['leaf1', 'p1', 'p2', 'p3', 'port1', 'sys']);
        expect(s.relationshipTypes).toEqual(['ExchangesWith']);
    });

    it('actionflow sample selects actions and items', () => {
        expect(byKind.get('actionflow')!.elementIds!.sort()).toEqual(['a1', 'a2', 'a3', 'i1']);
    });

    it('statetransition sample selects modes and machines', () => {
        expect(byKind.get('statetransition')!.elementIds!.sort()).toEqual(['s1', 's2', 's3']);
    });

    it('sequence sample selects steps and their owning chain', () => {
        expect(byKind.get('sequence')!.elementIds!.sort()).toEqual(['chain1', 'st1', 'st2', 'st3']);
    });

    it('grid sample selects the largest kind cohort', () => {
        expect(byKind.get('grid')!.elementIds!.sort()).toEqual(['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8']);
    });

    it('omits samples the model cannot demonstrate', () => {
        const sparse = makeModel([el('x1', 'Widget', 'core'), el('x2', 'Widget', 'core')], []);
        expect(deriveSampleDiagrams(sparse)).toEqual([]);
    });
});
