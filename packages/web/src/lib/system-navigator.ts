// ─── Drilling through a system's structure ───────────────────────────────────
//
// SoS -> system -> subsystem -> component. A part USAGE is a place; the definition it is typed by
// is what it is made of, so drilling from a usage goes into that definition's parts. Which
// definition a usage is typed by is memo-tools' answer (`workspaceMembership.definitionOf`, the one
// the workspace closure used), never a match of a type name here. A usage whose type is not in the
// model is a leaf, and a definition with no part usages is a leaf.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';

export interface NavigatorNode {
    id: string;
    name: string;
    kind: string;
    /** The definition drilling into this node opens, or undefined for a leaf of the model. */
    into: string | undefined;
    hasChildren: boolean;
}

/** The definition a node is made of: itself when it is one, else the definition it is typed by. */
export function drillTarget(model: MemoModelDTO, id: string): string | undefined {
    const element = model.elements[id];
    if (!element) return undefined;
    if (element.isDefinition) return element.id;
    const definition = model.workspaceMembership?.definitionOf?.[id];
    return definition && model.elements[definition] ? definition : undefined;
}

const isPart = (element: MemoElement) => element.construct === 'part' && !element.isDefinition;

/** The part usages a definition owns, in name order. */
function partsOf(model: MemoModelDTO, definitionId: string): MemoElement[] {
    return Object.values(model.elements)
        .filter(element => element.owner === definitionId && isPart(element))
        .sort((a, b) => a.name.localeCompare(b.name));
}

const nodeOf = (model: MemoModelDTO, element: MemoElement): NavigatorNode => {
    const into = drillTarget(model, element.id);
    return { id: element.id, name: element.name, kind: element.kind, into, hasChildren: !!into && partsOf(model, into).length > 0 };
};

/** What drilling into `id` shows. */
export function childrenOf(model: MemoModelDTO, id: string): NavigatorNode[] {
    const into = drillTarget(model, id);
    return into ? partsOf(model, into).map(part => nodeOf(model, part)) : [];
}

/**
 * Where the navigator starts: the chosen workspace's root, else the system of systems, else each
 * system. A model with no System has nothing to start from.
 */
export function navigatorRoots(model: MemoModelDTO, workspace: string | null): NavigatorNode[] {
    const workspaces = model.workspaceMembership?.workspaces ?? [];
    const chosen = workspaces.filter(candidate => candidate.root === workspace);
    const sos = workspaces.filter(candidate => candidate.scope === 'sos');
    const picked = chosen.length > 0 ? chosen : sos.length > 0 ? sos : workspaces;
    return picked
        .map(candidate => model.elements[candidate.root])
        .filter((element): element is MemoElement => !!element)
        .map(element => nodeOf(model, element));
}

/**
 * A definition and everything it owns, at any depth: what drilling into a usage typed by it has to be able to
 * draw. A view exposes the elements somebody put in it, and the parts of a definition a usage is typed by are
 * usually not among them (the system of systems' view does not list each system's insides), so the level
 * drilled into brings its own.
 */
export function definitionSubtree(model: MemoModelDTO, definitionId: string): string[] {
    const owned = new Map<string, string[]>();
    for (const element of Object.values(model.elements)) {
        if (element.owner) owned.set(element.owner, [...(owned.get(element.owner) ?? []), element.id]);
    }
    const out: string[] = [];
    const seen = new Set<string>();
    const walk = (id: string) => {
        if (seen.has(id)) return;
        seen.add(id);
        out.push(id);
        for (const child of owned.get(id) ?? []) walk(child);
    };
    walk(definitionId);
    return out;
}
