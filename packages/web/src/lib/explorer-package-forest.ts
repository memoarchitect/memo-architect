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
    /** `f:<package>` for a package; `kf:<package>|<kind>`, `af:<package>[|<kind>]|<value>` and `sf:<package>[|<kind>]|<source folder path>` for the folders inside one. */
    id: string;
    name: string;
    type: 'folder' | 'element';
    children: ForestNode[];
}

export interface ForestOptions<N extends ForestNode> {
    /** False skips the package folders: the roots are listed by kind alone. Undefined or true keeps them. */
    packageFolders?: boolean;
    /** The qualified name of the package that declares the element. */
    packageOf: (node: N) => string | undefined;
    kindOf: (node: N) => string;
    /** Position of a kind in the ontology's declaration order; unknown kinds sort last. */
    kindRank: (kind: string) => number;
    kindLabel: (kind: string, count: number) => string;
    folder: (id: string, name: string, children: N[]) => N;
    /**
     * A person-chosen way to split a folder's elements further: the value an element has for the attribute
     * they chose, or undefined when it has none. Elements split into a folder per value, and a folder
     * with one value (or none) is left alone. Nothing here names an attribute.
     */
    attributeOf?: (node: N) => string | undefined;
    /**
     * The folders an element came from in the source it was imported from (a Matrix folder path), outermost
     * first, or undefined when it states none. The imported hierarchy is shown as folders inside the package,
     * so the model need not carry a package per folder.
     */
    folderPathOf?: (node: N) => string[] | undefined;
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

    const splitByAttribute = (members: N[], scope: string): N[] => {
        if (!options.attributeOf) return members;
        const values = [...new Set(members.map(options.attributeOf).filter((v): v is string => v !== undefined))];
        if (values.length < 2) return members;
        const without = members.filter(node => options.attributeOf!(node) === undefined);
        return [
            ...values.sort((a, b) => a.localeCompare(b)).map(value => options.folder(
                `af:${scope}|${value}`, value,
                members.filter(node => options.attributeOf!(node) === value))),
            ...without,
        ];
    };

    /** Elements that state a source folder path are nested into folders by it; the rest stay where they are. */
    const nestByFolderPath = (members: N[], scope: string): N[] => {
        if (!options.folderPathOf) return members;
        interface Trie { id: string; name: string; direct: N[]; children: Trie[] }
        const loose: N[] = [];
        const trie: Trie[] = [];
        for (const member of members) {
            const path = options.folderPathOf(member)?.filter(Boolean);
            if (!path || path.length === 0) { loose.push(member); continue; }
            let level = trie;
            let id = '';
            let node: Trie | undefined;
            for (const name of path) {
                id = id ? `${id}|${name}` : name;
                node = level.find(candidate => candidate.id === id);
                if (!node) { node = { id, name, direct: [], children: [] }; level.push(node); }
                level = node.children;
            }
            node!.direct.push(member);
        }
        if (trie.length === 0) return members;
        const render = (node: Trie): N => options.folder(`sf:${scope}|${node.id}`, node.name,
            [...node.direct, ...[...node.children].sort((a, b) => a.name.localeCompare(b.name)).map(render)]);
        return [...loose, ...[...trie].sort((a, b) => a.name.localeCompare(b.name)).map(render)];
    };

    // Without package folders the roots are one level: by kind when there are several. The attribute a person
    // split by still applies, across every package, so a requirement type groups the same wherever it is declared.
    if (options.packageFolders === false) {
        const kinds = [...new Set(roots.map(options.kindOf))];
        if (kinds.length <= 1) return splitByAttribute([...roots], '');
        return kinds.sort((a, b) => options.kindRank(a) - options.kindRank(b) || a.localeCompare(b)).map(kind => {
            const ofKind = roots.filter(node => options.kindOf(node) === kind);
            return options.folder(`kf:|${kind}`, options.kindLabel(kind, ofKind.length), splitByAttribute(ofKind, `|${kind}`));
        });
    }

    const render = (branch: Branch): N => {
        const kinds = [...new Set(branch.direct.map(options.kindOf))];
        let members: N[];
        if (kinds.length > 1) {
            members = kinds
                .sort((a, b) => options.kindRank(a) - options.kindRank(b) || a.localeCompare(b))
                .map(kind => {
                    const ofKind = branch.direct.filter(node => options.kindOf(node) === kind);
                    return options.folder(`kf:${branch.id}|${kind}`, options.kindLabel(kind, ofKind.length),
                        nestByFolderPath(splitByAttribute(ofKind, `${branch.id}|${kind}`), `${branch.id}|${kind}`));
                });
        } else {
            members = nestByFolderPath(splitByAttribute(branch.direct, branch.id), branch.id);
        }
        const inner = [...branch.children].sort((a, b) => a.name.localeCompare(b.name)).map(render);
        return options.folder(`f:${branch.id}`, branch.name, [...members, ...inner]);
    };

    return [...top, ...[...forest].sort((a, b) => a.name.localeCompare(b.name)).map(render)];
}
