// ─── Browser View Template (KK-8) ────────────────────────────────────────────
//
// Standard data preparation for the SysML v2 `browser` view kind: the
// hierarchical membership tree as a first-class exposable view (not only
// the explorer panel).
//
// Hierarchy sources, in order of truth:
//   1. composition relationships among the view's elements (owner → part)
//   2. the SysML package an element is declared in (membership proper)
// Large flat packages additionally group their members by kind so the
// tree stays scannable.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoElement, MemoRelationship } from '@memo/core';
import { buildCompositionTree } from './composition-tree';

export interface BrowserNode {
    /** Element id, or a synthetic `pkg:`/`kind:` id for grouping nodes */
    id: string;
    label: string;
    /** Full qualified name for package nodes (tooltip) */
    title?: string;
    /** Element-backed nodes carry their element; grouping nodes do not */
    element?: MemoElement;
    kind?: string;
    layer?: string;
    children: BrowserNode[];
    /** Total element count in this subtree (grouping nodes included) */
    count: number;
}

/** Group a package's members by kind when it is large and heterogeneous. */
const KIND_GROUP_THRESHOLD = 8;

function elementNode(
    el: MemoElement,
    childrenMap: Map<string, string[]>,
    elements: Map<string, MemoElement>,
): BrowserNode {
    const children = (childrenMap.get(el.id) ?? [])
        .filter(id => elements.has(id))
        .map(id => elementNode(elements.get(id)!, childrenMap, elements));
    children.sort(byLabel);
    return {
        id: el.id,
        label: el.name,
        element: el,
        kind: el.kind,
        layer: el.layer,
        children,
        count: 1 + children.reduce((s, c) => s + c.count, 0),
    };
}

const byLabel = (a: BrowserNode, b: BrowserNode) =>
    (a.kind ?? '').localeCompare(b.kind ?? '') || a.label.localeCompare(b.label);

/**
 * Build the membership tree for a Browser view: composition roots hang
 * under their declaring package; composition children follow their parent.
 */
export function buildBrowserTree(
    elements: MemoElement[],
    relationships: MemoRelationship[],
): BrowserNode[] {
    const tree = buildCompositionTree(elements, relationships);

    // Package node per distinct declaring package of the composition roots
    const packages = new Map<string, BrowserNode>();
    const topLevel: BrowserNode[] = [];
    for (const rootId of tree.roots) {
        const el = tree.elements.get(rootId)!;
        const node = elementNode(el, tree.childrenMap, tree.elements);
        const pkg = el.package;
        if (!pkg) {
            topLevel.push(node);
            continue;
        }
        if (!packages.has(pkg)) {
            const label = pkg.split('::').pop() ?? pkg;
            const pkgNode: BrowserNode = {
                id: `pkg:${pkg}`, label, title: pkg, children: [], count: 0,
            };
            packages.set(pkg, pkgNode);
            topLevel.push(pkgNode);
        }
        const pkgNode = packages.get(pkg)!;
        pkgNode.children.push(node);
        pkgNode.count += node.count;
    }

    // Kind grouping inside large heterogeneous packages
    for (const pkgNode of packages.values()) {
        const kinds = new Set(pkgNode.children.map(c => c.kind));
        if (pkgNode.children.length <= KIND_GROUP_THRESHOLD || kinds.size <= 1) {
            pkgNode.children.sort(byLabel);
            continue;
        }
        const byKind = new Map<string, BrowserNode[]>();
        for (const child of pkgNode.children) {
            const k = child.kind ?? '—';
            if (!byKind.has(k)) byKind.set(k, []);
            byKind.get(k)!.push(child);
        }
        pkgNode.children = [...byKind.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([kind, members]) => ({
                id: `kind:${pkgNode.id}:${kind}`,
                label: kind,
                kind,
                layer: members[0]?.layer,
                children: members.sort(byLabel),
                count: members.reduce((s, m) => s + m.count, 0),
            }));
    }

    topLevel.sort(byLabel);
    return topLevel;
}

/**
 * The node ids to keep visible for a filter query (matches + all their
 * ancestors), and the ids to force-expand (ancestors of matches).
 * Returns undefined for an empty query (no filtering).
 */
export function filterBrowserTree(
    roots: BrowserNode[],
    query: string,
): { visible: Set<string>; expanded: Set<string> } | undefined {
    const q = query.trim().toLowerCase();
    if (!q) return undefined;
    const visible = new Set<string>();
    const expanded = new Set<string>();

    const visit = (node: BrowserNode, ancestors: string[]): boolean => {
        const selfMatch = node.label.toLowerCase().includes(q)
            || (node.kind ?? '').toLowerCase().includes(q);
        let childMatch = false;
        for (const child of node.children) {
            if (visit(child, [...ancestors, node.id])) childMatch = true;
        }
        if (selfMatch || childMatch) {
            visible.add(node.id);
            for (const a of ancestors) {
                visible.add(a);
                expanded.add(a);
            }
            if (childMatch) expanded.add(node.id);
            return true;
        }
        return false;
    };
    for (const root of roots) visit(root, []);
    return { visible, expanded };
}

/** Two-letter icon initials for a kind, e.g. LogicalFunction → "LF". */
export function kindInitials(kind: string | undefined): string {
    if (!kind) return '·';
    const caps = kind.replace(/[^A-Za-z]/g, '').match(/[A-Z]/g);
    if (caps && caps.length >= 2) return caps.slice(0, 2).join('');
    return kind.slice(0, 2).toUpperCase();
}
