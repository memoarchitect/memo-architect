// ─── A layer, as the packages that hold it ───────────────────────────────────
//
// The Model Explorer reads domain, then layer, then package, then the ownership hierarchy. This is
// the part below the layer: the elements of one layer, in the packages that declare them.
//
//   * A package is a folder, nested by its qualified name (`a::b::c` is c inside b inside a). A
//     chain with one child is not collapsed: the owning package is a node the reader looks for.
//   * A package appears only where it owns an element of this layer, directly or in a package
//     inside it. A package that spans layers appears under each, with only that layer's elements.
//   * Elements are listed once. One whose owner is in the layer is already its owner's child, so
//     only the roots arrive here. An element with no package sits at the top of the layer.
//   * A package that holds more than one kind directly splits those into kind folders, in the
//     ontology's declaration order; one that holds a single kind lists its elements as they are.
//
// Layer comes from the element's kind in the ontology, never from the file it sits in, which is
// decided before this runs. Nothing here names a kind or a layer.
// ─────────────────────────────────────────────────────────────────────────────

export interface ForestNode {
    /** `f:<qualified package>` for a package, `kf:<package>:<kind>` for a kind folder. */
    id: string;
    name: string;
    type: 'folder' | 'element';
    children: ForestNode[];
}

export interface ForestOptions<N extends ForestNode> {
    /** The qualified name of the package that declares the element. */
    packageOf: (node: N) => string | undefined;
    kindOf: (node: N) => string;
    /** Position of a kind in the ontology's declaration order; unknown kinds sort last. */
    kindRank: (kind: string) => number;
    kindLabel: (kind: string, count: number) => string;
    folder: (id: string, name: string, children: N[]) => N;
}

export function buildPackageForest<N extends ForestNode>(roots: readonly N[], options: ForestOptions<N>): N[] {
    interface Branch { id: string; name: string; direct: N[]; children: Branch[] }
    const top: N[] = [];
    const forest: Branch[] = [];

    for (const root of roots) {
        const segments = (options.packageOf(root) ?? '').split('::').filter(Boolean);
        if (segments.length === 0) { top.push(root); continue; }
        let level = forest;
        let branch: Branch | undefined;
        let path = '';
        for (const segment of segments) {
            path = path ? `${path}::${segment}` : segment;
            branch = level.find(candidate => candidate.id === path);
            if (!branch) { branch = { id: path, name: segment, direct: [], children: [] }; level.push(branch); }
            level = branch.children;
        }
        branch!.direct.push(root);
    }

    const render = (branch: Branch): N => {
        const kinds = [...new Set(branch.direct.map(options.kindOf))];
        let members: N[] = branch.direct;
        if (kinds.length > 1) {
            members = kinds
                .sort((a, b) => options.kindRank(a) - options.kindRank(b) || a.localeCompare(b))
                .map(kind => {
                    const ofKind = branch.direct.filter(node => options.kindOf(node) === kind);
                    return options.folder(`kf:${branch.id}:${kind}`, options.kindLabel(kind, ofKind.length), ofKind);
                });
        }
        const inner = [...branch.children].sort((a, b) => a.name.localeCompare(b.name)).map(render);
        return options.folder(`f:${branch.id}`, branch.name, [...members, ...inner]);
    };

    return [...top, ...[...forest].sort((a, b) => a.name.localeCompare(b.name)).map(render)];
}
