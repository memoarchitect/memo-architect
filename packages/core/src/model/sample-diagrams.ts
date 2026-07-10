// ─── Sample Diagram Deriver ──────────────────────────────────────────────────
//
// Synthesizes one sample diagram per renderable SysML v2 view kind (geometry
// is deferred, ADR-1-19) so every model ships a worked example of each
// KK-2..KK-8 template. Element selection is heuristic and model-agnostic:
// each sample picks the elements its template actually renders (actions for
// actionflow, states for statetransition, ...) and is skipped when the model
// has too few of them to demonstrate anything.
//
// Sample diagrams carry the `diag-sample-` id prefix; the web sidebar groups
// them under a "Samples" section within the Model Viewpoint.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoModel, MemoElement, DiagramDTO } from './semantic.js';

export const SAMPLE_DIAGRAM_ID_PREFIX = 'diag-sample-';

/** Minimum matching elements for a sample to be worth showing. */
const MIN_ELEMENTS = 3;

function cap<T>(items: T[], max: number): T[] {
    return items.length > max ? items.slice(0, max) : items;
}

function sample(
    kind: string,
    name: string,
    diagramType: string,
    description: string,
    elements: MemoElement[],
    relationshipTypes?: string[],
): DiagramDTO | undefined {
    if (elements.length < MIN_ELEMENTS) return undefined;
    return {
        id: `${SAMPLE_DIAGRAM_ID_PREFIX}${kind}`,
        name,
        diagramType,
        viewKind: kind,
        viewpointId: '__model',
        auto: true,
        description,
        elementIds: elements.map(e => e.id),
        ...(relationshipTypes?.length ? { relationshipTypes } : {}),
    };
}

/** Endpoints of the given relationships, in first-use order. */
function endpointElements(
    model: MemoModel,
    relTypes: Set<string>,
    maxElements: number,
): { elements: MemoElement[]; relTypes: string[] } {
    const seen = new Map<string, MemoElement>();
    const usedTypes = new Set<string>();
    for (const rel of model.relationships) {
        if (!relTypes.has(rel.type)) continue;
        for (const id of [rel.sourceId, rel.targetId]) {
            if (seen.size >= maxElements) break;
            const el = model.elements.get(id);
            if (el && !seen.has(id)) seen.set(id, el);
        }
        if (relTypes.has(rel.type)) usedTypes.add(rel.type);
        if (seen.size >= maxElements) break;
    }
    return { elements: [...seen.values()], relTypes: [...usedTypes] };
}

/**
 * Derive one sample diagram per renderable view kind from the model.
 * Samples with too few matching elements are omitted.
 */
export function deriveSampleDiagrams(model: MemoModel): DiagramDTO[] {
    const all = [...model.elements.values()];
    const out: (DiagramDTO | undefined)[] = [];

    // ── general: the most relationship-dense layer, as a connected subset ──
    const relCountByLayer = new Map<string, number>();
    for (const rel of model.relationships) {
        const s = model.elements.get(rel.sourceId);
        const t = model.elements.get(rel.targetId);
        if (s && t && s.layer === t.layer) {
            relCountByLayer.set(s.layer, (relCountByLayer.get(s.layer) ?? 0) + 1);
        }
    }
    const densestLayer = [...relCountByLayer.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (densestLayer) {
        const layerIds = new Set(
            (model.elementsByLayer.get(densestLayer) ?? []).map(e => e.id));
        const seen = new Map<string, MemoElement>();
        for (const rel of model.relationships) {
            if (seen.size >= 20) break;
            if (!layerIds.has(rel.sourceId) || !layerIds.has(rel.targetId)) continue;
            for (const id of [rel.sourceId, rel.targetId]) {
                const el = model.elements.get(id);
                if (el && !seen.has(id)) seen.set(id, el);
            }
        }
        out.push(sample('general', 'Sample: General View', 'bdd',
            `Connected elements from the ${densestLayer} layer with their relationships (graph, tree, and containment modes).`,
            [...seen.values()]));
    }

    // ── interconnection: parts exchanging flows, plus their boundary ports ──
    const exchange = endpointElements(model, new Set(['ExchangesWith', 'ConnectsPhysically']), 24);
    const ports = all.filter(el => el.construct === 'port' || el.kind.endsWith('Port'));
    out.push(sample('interconnection', 'Sample: Interconnection View', 'ibd',
        'Parts with boundary ports and typed connectors, from the model\'s exchange relationships.',
        cap([...exchange.elements, ...ports], 44),
        [...exchange.relTypes, 'Composes']));

    // ── actionflow: native actions and the items they pass ──
    const actions = all.filter(el =>
        el.construct === 'action' || el.kind === 'ActionUsage' || el.kind === 'ActionDefinition');
    const items = all.filter(el => el.kind === 'ItemDefinition');
    out.push(sample('actionflow', 'Sample: Action Flow View', 'afd',
        'Actions with parameter ports, item flows, and successions.',
        cap([...actions, ...items], 40)));

    // ── statetransition: states, modes, machines, transitions ──
    const states = all.filter(el =>
        el.kind.endsWith('State') || el.kind.endsWith('Machine')
        || el.kind.endsWith('Mode') || el.kind.endsWith('Transition'));
    out.push(sample('statetransition', 'Sample: State Transition View', 'stm',
        'Nested states and transition edges with trigger [guard] labels.',
        cap(states, 60)));

    // ── sequence: step occurrences and the chains that own them ──
    const steps = all.filter(el => el.kind.endsWith('Step') || !!el.attributes['stepOrder']);
    const stepIds = new Set(steps.map(s => s.id));
    const chainOwners = new Set<string>();
    for (const rel of model.relationships) {
        if (stepIds.has(rel.targetId) && !stepIds.has(rel.sourceId)) chainOwners.add(rel.sourceId);
    }
    const chains = all.filter(el => chainOwners.has(el.id));
    out.push(sample('sequence', 'Sample: Sequence View', 'seq',
        'Lifelines with chronological message occurrences from the model\'s step chains.',
        cap([...chains, ...steps], 60)));

    // ── grid: the largest kind cohort as a sortable table ──
    const largestKind = [...model.elementsByKind.entries()]
        .filter(([, els]) => els.length >= MIN_ELEMENTS)
        .sort((a, b) => b[1].length - a[1].length)[0];
    if (largestKind) {
        out.push(sample('grid', 'Sample: Grid View', 'alloc',
            `All ${largestKind[0]} elements as a table with auto-derived columns (matrix mode over their relationships).`,
            cap(largestKind[1], 60)));
    }

    // ── browser: membership tree over the largest layer ──
    const largestLayer = [...model.elementsByLayer.entries()]
        .filter(([, els]) => els.length >= MIN_ELEMENTS)
        .sort((a, b) => b[1].length - a[1].length)[0];
    if (largestLayer) {
        out.push(sample('browser', 'Sample: Browser View', 'bdd',
            `Membership tree over the ${largestLayer[0]} layer, grouped by kind.`,
            cap(largestLayer[1], 100)));
    }

    return out.filter((d): d is DiagramDTO => d !== undefined);
}
