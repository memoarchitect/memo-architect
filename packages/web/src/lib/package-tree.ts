// ─── Items in the packages that declare them ────────────────────────────────
//
// A SysML package is a folder, in every list that shows what a package holds. The nesting is the
// package's own qualified name (`a::b::c` is c in b in a), and an item belongs to the package that
// declares it: not to a folder an importer happens to re-export it from, and not to a group of
// leaf names merged across packages.
// ─────────────────────────────────────────────────────────────────────────────

export interface PackageNode<T> {
    /** Qualified name of the package, which is also its identity. */
    id: string;
    /** The last segment. */
    name: string;
    items: T[];
    children: PackageNode<T>[];
}

/** An item with no package is kept, under a folder of its own, never dropped. */
export const NO_PACKAGE = '(no owning package)';

export function buildPackageTree<T>(items: readonly T[], packageOf: (item: T) => string | undefined, labelOf: (item: T) => string = () => ''): PackageNode<T>[] {
    const root: PackageNode<T>[] = [];
    for (const item of items) {
        const segments = (packageOf(item) ?? '').split('::').filter(Boolean);
        let level = root;
        let owner: PackageNode<T> | undefined;
        let path = '';
        for (const segment of segments.length > 0 ? segments : [NO_PACKAGE]) {
            path = path && segments.length > 0 ? `${path}::${segment}` : segment;
            let node = level.find(candidate => candidate.id === path);
            if (!node) { node = { id: path, name: segment, items: [], children: [] }; level.push(node); }
            owner = node;
            level = node.children;
        }
        owner!.items.push(item);
    }
    const sort = (nodes: PackageNode<T>[]) => {
        nodes.sort((a, b) => a.name.localeCompare(b.name));
        for (const node of nodes) {
            node.items.sort((a, b) => labelOf(a).localeCompare(labelOf(b), undefined, { numeric: true }));
            sort(node.children);
        }
    };
    sort(root);
    return root;
}

/** How many items a folder holds, its sub-folders included. */
export function countIn<T>(node: PackageNode<T>): number {
    return node.items.length + node.children.reduce((total, child) => total + countIn(child), 0);
}
