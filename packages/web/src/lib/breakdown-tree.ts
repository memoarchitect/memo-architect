import type { MemoElement } from '@memoarchitect/tools/browser';
import { groupBySystem, type SystemResolution } from './system-grouping';

/**
 * The explorer's second view: a COMPOSITION breakdown, not a catalog.
 *
 * The catalog answers "what kinds exist and how many" — it groups by layer and
 * kind, which is the right shape for finding an element you can name. It is the
 * wrong shape for reading a system: a port shows up in the Ports folder rather
 * than on the component that owns it, and a function shows up next to 30 other
 * functions rather than under the one it decomposes.
 *
 * This builds the other view. Roots are the families worth reading top-down;
 * everything else hangs off its owner.
 */

/** A family the breakdown shows as a root branch, in reading order. */
export interface BreakdownFamily {
    id: string;
    label: string;
    /** True when an element belongs at this branch's root. */
    matches: (element: MemoElement) => boolean;
    /**
     * Set to file this family's roots under the system they belong to.
     *
     * A system-of-systems project has several devices in it, and one flat list
     * of use cases across all of them does not say which device a use case is
     * about. Roots that resolve to no system land under `Global` rather than
     * being dropped — an untraced use case is a finding, not a thing to hide.
     */
    systemOf?: (element: MemoElement) => SystemResolution;
}

export interface BreakdownNode {
    id: string;
    name: string;
    kind: string;
    /** Set when this node groups rather than decomposes — a nested package. */
    isGroup?: boolean;
    element?: MemoElement;
    children: BreakdownNode[];
}

export interface BreakdownBranch {
    id: string;
    label: string;
    nodes: BreakdownNode[];
}

const byConstruct = (...constructs: string[]) => (e: MemoElement) =>
    constructs.includes(e.construct);

/**
 * The families the user asked to read top-down: use cases, functions, and the
 * logical / physical / software structure. Anything not matched here is still
 * reachable — it appears under whichever of these owns it.
 */
export const DEFAULT_FAMILIES: BreakdownFamily[] = [
    { id: 'usecases', label: 'Use cases', matches: byConstruct('use case') },
    { id: 'functions', label: 'Functions', matches: byConstruct('action') },
    { id: 'logical', label: 'Logical', matches: e => e.layer === 'logical' && e.construct === 'part' },
    { id: 'physical', label: 'Physical', matches: e => e.layer === 'realization' && e.construct === 'part' },
    { id: 'software', label: 'Software', matches: e => e.layer === 'implementation' && e.construct === 'part' },
    { id: 'operational', label: 'Operational', matches: e => e.layer === 'operational' && e.construct === 'part' },
];

/**
 * Group elements by their `elementPackage` attribute, the label a nested
 * grouping package stamps on its members. The package groups; it does not own,
 * so its members keep their real owner and only their DISPLAY is nested.
 */
function withGrouping(children: BreakdownNode[]): BreakdownNode[] {
    const groups = new Map<string, BreakdownNode>();
    const out: BreakdownNode[] = [];
    for (const child of children) {
        const group = child.element?.attributes?.['elementPackage'];
        if (!group) { out.push(child); continue; }
        let node = groups.get(group);
        if (!node) {
            node = { id: `pkg:${group}`, name: group, kind: 'ElementPackage', isGroup: true, children: [] };
            groups.set(group, node);
            out.push(node);
        }
        node.children.push(child);
    }
    return out;
}

/**
 * Build the breakdown.
 *
 * An element appears at a branch root only when it matches that family AND is
 * not owned by something already in the tree — an owned element belongs under
 * its owner, which is the whole point. A cycle in `owner` (which the model
 * should not contain, but a hand-edited file can) terminates rather than
 * recursing forever.
 */
export function buildBreakdown(
    elements: MemoElement[],
    families: BreakdownFamily[] = DEFAULT_FAMILIES,
    searchTerm = '',
): BreakdownBranch[] {
    const byId = new Map(elements.map(e => [e.id, e]));

    // A model-local DEFINITION and its usages were listed as siblings:
    // `AcquireSensorData` (an ActionDefinition) next to `acquireSensors`, which
    // is a usage OF it. A usage belongs under its def — that is what makes the
    // list readable, and it is what the definition is for.
    //
    // The link is the usage's `kind`: it names the def. Only definitions that
    // are themselves elements of this model can parent anything; a usage of an
    // ONTOLOGY kind has no local def to sit under and stays where it is.
    const definitionByName = new Map<string, MemoElement>();
    for (const e of elements) {
        if (/Definition$|Def$/.test(e.kind)) definitionByName.set(e.name || e.id, e);
    }

    const parentOf = (e: MemoElement): string | undefined => {
        if (e.owner && byId.has(e.owner)) return e.owner;
        const def = definitionByName.get(e.kind);
        // Never let a definition parent itself, and never build a 2-cycle.
        if (def && def.id !== e.id && def.kind !== e.kind) return def.id;
        return undefined;
    };

    const childrenOf = new Map<string, MemoElement[]>();
    for (const e of elements) {
        const parent = parentOf(e);
        if (!parent) continue;
        (childrenOf.get(parent) ?? childrenOf.set(parent, []).get(parent)!).push(e);
    }

    const claimed = new Set<string>();

    const node = (e: MemoElement, seen: Set<string>): BreakdownNode => {
        seen.add(e.id);
        const kids = (childrenOf.get(e.id) ?? [])
            // An element that an earlier branch already took has one home, not
            // two: a use case declared inside the pump belongs to the Use cases
            // branch, under the pump's group, and must not also reappear inside
            // the pump's own structure tree.
            .filter(c => !seen.has(c.id) && !claimed.has(c.id))
            .map(c => node(c, seen));
        return {
            id: e.id, name: e.name || e.id, kind: e.kind, element: e,
            children: withGrouping(kids),
        };
    };

    const lower = searchTerm.trim().toLowerCase();
    const matchesSearch = (n: BreakdownNode): boolean =>
        !lower
        || n.name.toLowerCase().includes(lower)
        || n.kind.toLowerCase().includes(lower)
        || n.children.some(matchesSearch);

    return families.map(family => {
        // A grouped family reads top-down under its system, so an owner that is
        // NOT itself a use case does not make a use case a child of something:
        // being declared inside the pump is exactly what puts it in the pump's
        // group. Only a use case inside a use case is a nested one.
        const isRoot = (e: MemoElement) => {
            const parent = parentOf(e);
            if (!parent) return true;
            return Boolean(family.systemOf) && !family.matches(byId.get(parent)!);
        };
        const roots = elements
            .filter(e => family.matches(e))
            .filter(isRoot)
            .filter(e => !claimed.has(e.id));
        for (const r of roots) claimed.add(r.id);
        const seen = new Set<string>();
        const built = roots.map(r => node(r, seen));
        const nodes = family.systemOf
            ? groupBySystem(built, n => family.systemOf!(n.element!))
                .map(group => ({
                    id: `sys:${group.systemId ?? group.label}`,
                    name: group.label,
                    kind: group.systemId ? 'System' : 'Global',
                    isGroup: true,
                    children: withGrouping(group.items),
                }))
                .filter(matchesSearch)
            : withGrouping(built).filter(matchesSearch);
        return { id: family.id, label: family.label, nodes };
    }).filter(branch => branch.nodes.length > 0);
}
