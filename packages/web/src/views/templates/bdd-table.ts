// ─── BDD table outline ───────────────────────────────────────────────────────
//
// The table presentation of a general (block definition) view: the same
// composition tree that tree and containment draw, flattened into rows the way
// a spreadsheet outline is — one row per element, indented by depth, with a
// disclosure caret on any row that has children. Collapse state is the same
// `expandedNodes` set the other two hierarchy modes use, so a branch opened in
// the tree is open in the table.
// ─────────────────────────────────────────────────────────────────────────────

import { activityNodeType, isControlNode, relationshipsOfType, type MemoElement, type MemoModelDTO } from '@memoarchitect/tools/browser';
import { displayNameOf, type CompositionTree } from './composition-tree';

export interface BddTableRow {
    id: string;
    depth: number;
    element: MemoElement;
    name: string;
    /** Children this row has in the tree, whether or not they are showing. */
    childCount: number;
    expanded: boolean;
}

/**
 * Visible rows, in document order. A row's children follow it only while it is
 * expanded. An element reached twice (a cycle) is listed once.
 */
export function flattenBddRows(
    tree: CompositionTree,
    expanded: ReadonlySet<string>,
    definitions?: ReadonlyMap<string, MemoElement>,
): BddTableRow[] {
    const rows: BddTableRow[] = [];
    const seen = new Set<string>();
    const visit = (id: string, depth: number) => {
        const element = tree.elements.get(id);
        if (!element || seen.has(id)) return;
        seen.add(id);
        const children = (tree.childrenMap.get(id) ?? []).filter(child => tree.elements.has(child));
        const isOpen = expanded.has(id);
        rows.push({
            id, depth, element, childCount: children.length, expanded: isOpen,
            name: displayNameOf(element, definitions),
        });
        if (isOpen) for (const child of children) visit(child, depth + 1);
    };
    for (const root of tree.roots) visit(root, 0);
    return rows;
}

/**
 * The table of a flow view: its actions, each under the action that owns it, in the order the flow runs. Control
 * nodes route the flow and are not steps of it.
 */
export function buildFlowTableTree(model: MemoModelDTO, visible?: (element: MemoElement) => boolean): CompositionTree {
    const actions = Object.values(model.elements).filter(element =>
        (!visible || visible(element))
        && activityNodeType(element, model.registries) !== undefined
        && !isControlNode(element, model.registries));
    const elements = new Map(actions.map(action => [action.id, action]));
    const childrenMap = new Map<string, string[]>();
    const roots: string[] = [];
    for (const action of actions) {
        if (action.parentAction && elements.has(action.parentAction)) {
            childrenMap.set(action.parentAction, [...(childrenMap.get(action.parentAction) ?? []), action.id]);
        } else roots.push(action.id);
    }
    const links = relationshipsOfType(model, 'succession', 'flow');
    for (const [parent, children] of childrenMap) childrenMap.set(parent, inRunOrder(children, links));
    return { roots: inRunOrder(roots, links), childrenMap, elements };
}

/** Each step after what leads to it; a loop, or a step nothing orders, keeps its place. */
function inRunOrder(ids: string[], links: readonly { sourceId: string; targetId: string }[]): string[] {
    const members = new Set(ids);
    const before = new Map(ids.map(id => [id, new Set<string>()]));
    for (const link of links) {
        if (members.has(link.sourceId) && members.has(link.targetId) && link.sourceId !== link.targetId) before.get(link.targetId)!.add(link.sourceId);
    }
    const ordered: string[] = [];
    const remaining = [...ids];
    while (remaining.length > 0) {
        const next = remaining.findIndex(id => [...before.get(id)!].every(prior => ordered.includes(prior)));
        ordered.push(...remaining.splice(next === -1 ? 0 : next, 1));
    }
    return ordered;
}

/** Every element that has children, to expand the whole outline. */
export function allBranchIds(tree: CompositionTree): Set<string> {
    const ids = new Set<string>();
    for (const [id, children] of tree.childrenMap) {
        if (tree.elements.has(id) && children.some(child => tree.elements.has(child))) ids.add(id);
    }
    return ids;
}

/**
 * The outline-level buttons of a spreadsheet: show everything down to `level`
 * (1 = roots only, 2 = roots and their children, ...). Rows at the last
 * shown level stay collapsed.
 */
export function branchIdsToLevel(tree: CompositionTree, level: number): Set<string> {
    const ids = new Set<string>();
    const seen = new Set<string>();
    const visit = (id: string, depth: number) => {
        if (seen.has(id) || !tree.elements.has(id)) return;
        seen.add(id);
        const children = (tree.childrenMap.get(id) ?? []).filter(child => tree.elements.has(child));
        if (depth < level && children.length) ids.add(id);
        for (const child of children) visit(child, depth + 1);
    };
    for (const root of tree.roots) visit(root, 1);
    return ids;
}

/** The deepest level the tree reaches, so the level buttons stop where the data does. */
export function treeDepth(tree: CompositionTree): number {
    const seen = new Set<string>();
    const depthOf = (id: string): number => {
        if (seen.has(id) || !tree.elements.has(id)) return 0;
        seen.add(id);
        const children = (tree.childrenMap.get(id) ?? []).filter(child => tree.elements.has(child));
        return 1 + Math.max(0, ...children.map(depthOf));
    };
    return Math.max(0, ...tree.roots.map(depthOf));
}
