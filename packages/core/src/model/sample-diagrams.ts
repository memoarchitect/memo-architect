// ─── Sample Diagram Deriver ──────────────────────────────────────────────────
//
// Synthesizes one sample diagram per renderable SysML v2 view kind (geometry
// is deferred, ADR-1-19; browser belongs to the catalog, not diagram mode)
// so every model ships a worked example of each KK-2..KK-7 template.
//
// Element selection is structural, not statistical:
//   general          the model's strict parent→child composition forest,
//                    rendered as an interactive decomposition tree (BDD)
//   interconnection  one context block — the part whose internal parts and
//                    boundary ports exchange the most flows (IBD)
//   others           the elements their template actually renders
//
// Sample diagrams carry the `diag-sample-` id prefix; the web sidebar groups
// them under a "Samples" section within the Model Viewpoint.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoModel, MemoElement, DiagramDTO } from './semantic.js';

export const SAMPLE_DIAGRAM_ID_PREFIX = 'diag-sample-';

/** Minimum matching elements for a sample to be worth showing. */
const MIN_ELEMENTS = 3;

/** Relationship types expressing whole→part composition (source=parent). */
const COMPOSITION_REL_TYPES = new Set([
    'composedOf', 'composes', 'decomposedBy', 'aggregation',
]);

function cap<T>(items: T[], max: number): T[] {
    return items.length > max ? items.slice(0, max) : items;
}

function sample(
    kind: string,
    name: string,
    diagramType: string,
    description: string,
    elements: MemoElement[],
    extra?: Partial<DiagramDTO>,
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
        ...extra,
    };
}

// ─── Composition forest ──────────────────────────────────────────────────────

interface CompositionForest {
    /** parent id → child ids (single parent per child, first edge wins) */
    childrenMap: Map<string, string[]>;
    /** roots that actually have children, largest subtree first */
    roots: string[];
}

function buildCompositionForest(model: MemoModel): CompositionForest {
    const childrenMap = new Map<string, string[]>();
    const hasParent = new Set<string>();
    for (const rel of model.relationships) {
        if (!COMPOSITION_REL_TYPES.has(rel.type)) continue;
        if (rel.sourceId === rel.targetId) continue;
        if (!model.elements.has(rel.sourceId) || !model.elements.has(rel.targetId)) continue;
        if (hasParent.has(rel.targetId)) continue;
        if (!childrenMap.has(rel.sourceId)) childrenMap.set(rel.sourceId, []);
        childrenMap.get(rel.sourceId)!.push(rel.targetId);
        hasParent.add(rel.targetId);
    }
    const subtreeSize = (id: string): number =>
        1 + (childrenMap.get(id) ?? []).reduce((s, c) => s + subtreeSize(c), 0);
    const roots = [...childrenMap.keys()]
        .filter(id => !hasParent.has(id))
        .sort((a, b) => subtreeSize(b) - subtreeSize(a));
    return { childrenMap, roots };
}

/** DFS over the forest from the given roots, in root order. */
function collectForestElements(
    model: MemoModel,
    forest: CompositionForest,
    maxElements: number,
): MemoElement[] {
    const out: MemoElement[] = [];
    const seen = new Set<string>();
    const visit = (id: string) => {
        if (out.length >= maxElements || seen.has(id)) return;
        seen.add(id);
        const el = model.elements.get(id);
        if (!el) return;
        out.push(el);
        for (const cid of forest.childrenMap.get(id) ?? []) visit(cid);
    };
    for (const rootId of forest.roots) visit(rootId);
    return out;
}

// ─── Interconnection context ─────────────────────────────────────────────────

interface InterconnectionContext {
    elements: MemoElement[];
    connectorTypes: string[];
}

/**
 * Pick the best IBD context: the composition parent whose family (itself,
 * its descendants, and ports owned by any of them) is connected by the most
 * non-composition relationships. That family is exactly what the
 * Interconnection template renders: a context frame, parts inside it,
 * boundary ports, and typed connectors between them.
 */
function findInterconnectionContext(
    model: MemoModel,
    forest: CompositionForest,
    maxElements: number,
): InterconnectionContext | undefined {
    // family = parent + all descendants (composition already includes ports
    // modelled as children); plus elements owned via the builder's owner link
    const familyOf = (pid: string): Set<string> => {
        const fam = new Set<string>();
        const visit = (id: string) => {
            if (fam.has(id)) return;
            fam.add(id);
            for (const cid of forest.childrenMap.get(id) ?? []) visit(cid);
        };
        visit(pid);
        for (const el of model.elements.values()) {
            if (el.owner && fam.has(el.owner)) fam.add(el.id);
        }
        return fam;
    };

    let best: { pid: string; family: Set<string>; conns: number; types: Set<string> } | undefined;
    for (const pid of forest.childrenMap.keys()) {
        const family = familyOf(pid);
        let conns = 0;
        const types = new Set<string>();
        for (const rel of model.relationships) {
            if (COMPOSITION_REL_TYPES.has(rel.type)) continue;
            if (rel.sourceId === rel.targetId) continue;
            if (family.has(rel.sourceId) && family.has(rel.targetId)) {
                conns++;
                types.add(rel.type);
            }
        }
        if (conns > 0 && (!best || conns > best.conns)) {
            best = { pid, family, conns, types };
        }
    }
    if (!best) return undefined;

    // Emit in DFS order (context first) so the cap keeps the tree coherent
    const ordered: MemoElement[] = [];
    const seen = new Set<string>();
    const visit = (id: string) => {
        if (ordered.length >= maxElements || seen.has(id) || !best!.family.has(id)) return;
        seen.add(id);
        const el = model.elements.get(id);
        if (!el) return;
        ordered.push(el);
        for (const cid of forest.childrenMap.get(id) ?? []) visit(cid);
    };
    visit(best.pid);
    for (const id of best.family) visit(id);
    return { elements: ordered, connectorTypes: [...best.types] };
}

/**
 * Derive one sample diagram per renderable view kind from the model.
 * Samples with too few matching elements are omitted.
 */
export function deriveSampleDiagrams(model: MemoModel): DiagramDTO[] {
    const all = [...model.elements.values()];
    const out: (DiagramDTO | undefined)[] = [];
    const forest = buildCompositionForest(model);

    // ── general (BDD): the strict parent→child composition forest ──
    out.push(sample('general', 'Sample: General View (BDD)', 'bdd',
        'Strict parent–child decomposition tree from the model\'s composition relationships. '
        + 'Starts collapsed: expand each node with +, toggle its expansion direction with V/H, '
        + 'or switch to nested containment blocks.',
        collectForestElements(model, forest, 80),
        { properties: { layoutHint: 'tree', modes: 'tree,containment' } }));

    // ── interconnection (IBD): one context block with parts, ports, flows ──
    const ctx = findInterconnectionContext(model, forest, 40);
    if (ctx) {
        const ctxName = ctx.elements[0]?.name;
        out.push(sample('interconnection', 'Sample: Interconnection View (IBD)', 'ibd',
            `Inside the ${ctxName} block: its parts and boundary ports wired by typed connectors.`,
            ctx.elements,
            { relationshipTypes: ctx.connectorTypes }));
    }

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

    return out.filter((d): d is DiagramDTO => d !== undefined);
}
