// ─── Sequence View Template (KK-6) ───────────────────────────────────────────
//
// Standard renderer template for the SysML v2 `sequence` view kind:
// lifelines (the functions/parts that steps are allocated to), event
// occurrences in chronological order, and messages labeled with the
// exchanged item. Sections group the messages per functional chain, with
// the realized scenario named in the section header.
//
// Geometry is deterministic (no ELK): lifelines are columns, time flows
// top-down, one row per step occurrence.
// ─────────────────────────────────────────────────────────────────────────────

import type { Node, Edge } from '@xyflow/react';
import type { MemoElement, MemoModelDTO } from '@memo/core';
import { EDGE, FONT } from '../../styles/tokens';
import type { LayoutResult } from '../layout';
import { COMPOSITION_REL_TYPES } from './composition-tree';

// ─── Structure derivation ────────────────────────────────────────────────────

/** Relationship types that bind a chain to its ordered steps. */
const STEP_MEMBERSHIP_TYPES = new Set(['includesStep', ...COMPOSITION_REL_TYPES]);

export interface SequenceLifeline {
    /** Stable key (resolved element id or the raw reference) */
    id: string;
    label: string;
}

export interface SequenceOccurrence {
    step: MemoElement;
    /** Index into the lifelines array */
    lane: number;
    /** Short label of the item this step passes on */
    item?: string;
}

export interface SequenceSection {
    chain?: MemoElement;
    /** Realized scenario name, when a RealizesScenario edge exists */
    scenario?: string;
    occurrences: SequenceOccurrence[];
}

export interface SequenceModel {
    lifelines: SequenceLifeline[];
    sections: SequenceSection[];
}

/** A view element that is a sequence step occurrence. */
export function isStepElement(el: MemoElement): boolean {
    return el.kind.endsWith('Step') || !!el.attributes['stepOrder'];
}

/** "DD-002: BolusRequestSignal" → "BolusRequestSignal" */
export function itemShortName(raw: string | undefined): string | undefined {
    if (!raw) return undefined;
    const parts = raw.split(':');
    return (parts.length > 1 ? parts[parts.length - 1] : parts[0]).trim() || undefined;
}

/**
 * Resolve a step's allocatedFunction reference ("FUNC-001" or an element
 * id) to a display label, searching attribute ids and element ids.
 */
export function resolveLifelineLabel(ref: string, model: MemoModelDTO): string {
    const key = ref.split(':')[0].trim();
    const direct = model.elements[key];
    if (direct) return direct.name;
    for (const el of Object.values(model.elements)) {
        if (el.attributes['id'] === key) return el.name;
    }
    return ref;
}

const numericOrder = (el: MemoElement) => {
    const n = Number(el.attributes['stepOrder']);
    return Number.isFinite(n) ? n : 0;
};

/**
 * Derive lifelines + chain sections from the view's visible elements.
 * Steps bind to their chain via IncludesStep/composition edges; steps
 * without a chain form a trailing unassigned section.
 */
export function buildSequenceModel(
    model: MemoModelDTO,
    viewpointFilter?: (el: MemoElement) => boolean,
): SequenceModel {
    const all = Object.values(model.elements);
    const visible = viewpointFilter ? all.filter(viewpointFilter) : all;
    const steps = visible.filter(isStepElement);
    const stepIds = new Set(steps.map(s => s.id));
    const chains = visible.filter(el => !isStepElement(el)
        && model.relationships.some(r =>
            STEP_MEMBERSHIP_TYPES.has(r.type) && r.sourceId === el.id && stepIds.has(r.targetId)));

    // Lifelines: one per distinct allocation reference, in first-use order
    const lifelines: SequenceLifeline[] = [];
    const laneOf = new Map<string, number>();
    const laneFor = (ref: string): number => {
        const key = ref.split(':')[0].trim() || ref;
        if (!laneOf.has(key)) {
            laneOf.set(key, lifelines.length);
            lifelines.push({ id: key, label: resolveLifelineLabel(ref, model) });
        }
        return laneOf.get(key)!;
    };

    const toOccurrences = (chainSteps: MemoElement[]): SequenceOccurrence[] =>
        [...chainSteps]
            .sort((a, b) => numericOrder(a) - numericOrder(b))
            .map(step => ({
                step,
                lane: laneFor(step.attributes['allocatedFunction'] ?? step.allocatedTo ?? step.id),
                item: itemShortName(step.attributes['exchangeItem']),
            }));

    const scenarioNameFor = (chain: MemoElement): string | undefined => {
        const rel = model.relationships.find(r =>
            r.type === 'realizesScenario' && r.sourceId === chain.id);
        return rel ? model.elements[rel.targetId]?.name : undefined;
    };

    const claimed = new Set<string>();
    const sections: SequenceSection[] = [];
    for (const chain of chains) {
        const members = model.relationships
            .filter(r => STEP_MEMBERSHIP_TYPES.has(r.type) && r.sourceId === chain.id && stepIds.has(r.targetId))
            .map(r => model.elements[r.targetId]);
        for (const m of members) claimed.add(m.id);
        sections.push({
            chain,
            scenario: scenarioNameFor(chain),
            occurrences: toOccurrences(members),
        });
    }
    const unclaimed = steps.filter(s => !claimed.has(s.id));
    if (unclaimed.length > 0) {
        sections.push({ occurrences: toOccurrences(unclaimed) });
    }

    return { lifelines, sections: sections.filter(s => s.occurrences.length > 0) };
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const LANE_WIDTH = 240;
const HEADER_HEIGHT = 52;
const ROW_HEIGHT = 68;
const SECTION_HEADER_HEIGHT = 40;
const SECTION_GAP = 24;
const ANCHOR_SIZE = 14;

export interface SequenceViewOptions {
    viewpointFilter?: (el: MemoElement) => boolean;
}

export function computeSequenceLayout(
    model: MemoModelDTO,
    options?: SequenceViewOptions,
): LayoutResult {
    const seq = buildSequenceModel(model, options?.viewpointFilter);
    if (seq.lifelines.length === 0) return { nodes: [], edges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const laneCenter = (lane: number) => lane * LANE_WIDTH + LANE_WIDTH / 2;

    // Row bookkeeping: walk sections to assign a y to every occurrence
    let y = HEADER_HEIGHT + 28;
    interface PlacedOccurrence extends SequenceOccurrence { y: number }
    const placedSections: { section: SequenceSection; top: number; bottom: number; placed: PlacedOccurrence[] }[] = [];
    for (const section of seq.sections) {
        const top = y;
        y += SECTION_HEADER_HEIGHT;
        const placed: PlacedOccurrence[] = section.occurrences.map(o => {
            const row = { ...o, y };
            y += ROW_HEIGHT;
            return row;
        });
        placedSections.push({ section, top, bottom: y, placed });
        y += SECTION_GAP;
    }
    const totalHeight = y;
    const totalWidth = seq.lifelines.length * LANE_WIDTH;

    // ── Lifelines (header + dashed tail), one per lane ──
    seq.lifelines.forEach((lifeline, lane) => {
        nodes.push({
            id: `__lifeline_${lifeline.id}`,
            type: 'seqLifeline',
            position: { x: lane * LANE_WIDTH, y: 0 },
            data: { label: lifeline.label },
            style: { width: LANE_WIDTH, height: totalHeight },
            draggable: false,
            selectable: false,
            zIndex: -2,
        });
    });

    // ── Section bands + occurrences + messages ──
    placedSections.forEach(({ section, top, bottom, placed }, si) => {
        nodes.push({
            id: `__section_${si}`,
            type: 'seqSection',
            position: { x: -24, y: top },
            data: {
                label: section.chain?.name ?? 'Steps',
                scenario: section.scenario,
            },
            style: { width: totalWidth + 48, height: bottom - top },
            draggable: false,
            selectable: false,
            zIndex: -1,
        });

        placed.forEach((occ, oi) => {
            nodes.push({
                id: occ.step.id,
                type: 'seqOccurrence',
                position: {
                    x: laneCenter(occ.lane) - ANCHOR_SIZE / 2,
                    y: occ.y - ANCHOR_SIZE / 2,
                },
                data: { label: occ.step.name, kind: occ.step.kind },
                draggable: false,
                zIndex: 2,
            });

            if (oi < placed.length - 1) {
                const next = placed[oi + 1];
                const rightward = next.lane >= occ.lane;
                const sameLane = next.lane === occ.lane;
                edges.push({
                    id: `seq-${si}-${oi}`,
                    source: occ.step.id,
                    target: next.step.id,
                    sourceHandle: sameLane ? 'right' : rightward ? 'right' : 'left',
                    targetHandle: sameLane ? 'right' : rightward ? 'left' : 'right',
                    type: sameLane ? 'smoothstep' : 'straight',
                    label: occ.item,
                    style: { stroke: '#3498DB', strokeWidth: EDGE.flowWidth },
                    labelStyle: { fontSize: FONT.badge, fill: '#4A90D9', fontWeight: 600 },
                    labelBgPadding: EDGE.labelBgPadding,
                    labelBgBorderRadius: EDGE.labelBgRadius,
                    labelBgStyle: EDGE.labelBgStyle,
                    markerEnd: {
                        type: 'arrowclosed' as never,
                        color: '#3498DB',
                        width: EDGE.arrowSize,
                        height: EDGE.arrowSize,
                    },
                    zIndex: 1,
                });
            }
        });
    });

    return { nodes, edges };
}
