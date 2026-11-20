// ─── Where a system's functions are allocated ────────────────────────────────
//
// The Functional layer's Allocation page reads this. Which kinds a system function may be allocated to
// comes from the method (the function tree task's `allocationKinds`), never from a list here: the page
// only sorts what the method allows into the system's own targets and the rest.
// ─────────────────────────────────────────────────────────────────────────────

import { findRelationshipDefinition, indexKinds, kindConformsTo, legalRelationshipTypes, type MemoModelDTO } from '@memoarchitect/tools/browser';

type Element = MemoModelDTO['elements'][string];

export interface AllocationTarget {
    element: Element;
    /** A system or system of systems the model offers as a workspace, as opposed to a part inside one. */
    system: boolean;
}

/** The id a person reads: the model's display id, or its short id. Architect never makes one. */
export function readableId(element: Element | undefined): string {
    return element?.displayId ?? element?.shortId ?? '';
}

/** What each function is allocated to, by function id. */
export function allocationIndex(model: MemoModelDTO): Map<string, string[]> {
    const index = new Map<string, string[]>();
    for (const edge of model.relationships) {
        if (edge.type !== 'allocatedTo' || !model.elements[edge.targetId]) continue;
        const targets = index.get(edge.sourceId) ?? [];
        if (!targets.includes(edge.targetId)) targets.push(edge.targetId);
        index.set(edge.sourceId, targets);
    }
    return index;
}

/**
 * The targets a function of `workspace` can be allocated to. SysML allocates between features, so a system is
 * offered through its usages (`part pump : PumpSystem`), never its definition; a system with no usage cannot be
 * allocated to. Alongside them: the parts inside this system whose kind the method allows, and anything the
 * functions are already allocated to, so the page never hides an existing allocation. The workspace's own usages
 * come first.
 */
export function allocationTargets(model: MemoModelDTO, workspace: string, kinds: readonly string[], functions: readonly Element[]): AllocationTarget[] {
    const registry = indexKinds(model.registries?.kinds ?? []);
    const allowed = (element: Element) => kinds.some(kind => kindConformsTo(element.kind, kind, registry));
    const roots = new Set((model.workspaceMembership?.workspaces ?? []).map(entry => entry.root));
    const definitionOf = model.workspaceMembership?.definitionOf ?? {};
    const chosen = new Map<string, AllocationTarget>();
    const add = (id: string) => {
        const element = model.elements[id];
        if (!element || element.isDefinition || chosen.has(id)) return;
        chosen.set(id, { element, system: roots.has(definitionOf[id] ?? '') });
    };
    const usages = Object.keys(definitionOf).filter(id => roots.has(definitionOf[id]));
    for (const id of usages.filter(usage => definitionOf[usage] === workspace)) add(id);
    for (const id of usages) if (model.elements[definitionOf[id]] && allowed(model.elements[definitionOf[id]])) add(id);
    const index = allocationIndex(model);
    for (const fn of functions) for (const target of index.get(fn.id) ?? []) add(target);
    for (const element of Object.values(model.elements)) {
        if (element.isDefinition || roots.has(definitionOf[element.id] ?? '') || !allowed(element)) continue;
        if (model.workspaceMembership?.membership[element.id]?.includes(workspace)) add(element.id);
    }
    // The ontology's relationship rules decide whether a function may be allocated to a target at all.
    const registries = model.registries;
    const allocation = registries ? findRelationshipDefinition('allocatedTo', registries) : undefined;
    const subject = functions[0];
    const legal = (target: AllocationTarget) => !allocation || !subject
        || legalRelationshipTypes(subject, target.element, registries!).some(option => option.definition.name === allocation.name && option.direction === 'outgoing');
    const all = [...chosen.values()].filter(target => legal(target) || functions.some(fn => (index.get(fn.id) ?? []).includes(target.element.id)));
    const own = (target: AllocationTarget) => definitionOf[target.element.id] === workspace;
    return [...all.filter(own), ...all.filter(target => !own(target) && target.system), ...all.filter(target => !target.system)];
}

export interface AllocationSummary { allocated: number; total: number; withPurpose: number }

export function allocationSummary(model: MemoModelDTO, functions: readonly Element[]): AllocationSummary {
    const index = allocationIndex(model);
    return {
        allocated: functions.filter(fn => (index.get(fn.id) ?? []).length > 0).length,
        total: functions.length,
        withPurpose: functions.filter(fn => !!fn.doc?.trim()).length,
    };
}
