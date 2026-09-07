import { describe, it, expect } from 'vitest';
import { artifactCategory, buildOwnerThenPackageTree, buildOwnershipTree, buildTree, computeExplorerGroupTree } from '../ExplorerPanel';
import type { KindDefinitionDTO, MemoElement } from '@memoarchitect/tools/browser';
import type { OntologyPackageInfo } from '../../types/ontology';

// Mirrors the vendored @memoarchitect/ontology package shape: layer ids are the
// top-level src/ directories, kinds carry their namespace sub-group (the
// directory under the layer), and no layer declares the builder-synthesized
// kinds for native SysML constructs (action def / action / item def).
const ONTOLOGY: OntologyPackageInfo = {
    name: '@memoarchitect/ontology',
    version: '0.2.0',
    type: 'ontology',
    description: '',
    kindCount: 4,
    relationshipCount: 0,
    relationshipTypes: [],
    selected: true,
    layers: [
        {
            id: 'architecture',
            label: 'Architecture',
            color: '#7B68EE',
            kindCount: 2,
            kinds: [
                { name: 'StateMachine', label: 'State Machine', construct: 'part', layer: 'architecture', instanceCount: 0, viewpoints: [], group: 'functional' },
                { name: 'InterfaceItem', label: 'Interface Item', construct: 'item', layer: 'architecture', instanceCount: 0, viewpoints: [], group: 'logical' },
            ],
        },
        {
            id: 'assurance',
            label: 'Assurance',
            color: '#E74C3C',
            kindCount: 4,
            kinds: [
                { name: 'Hazard', label: 'Hazard', construct: 'item', layer: 'assurance', instanceCount: 0, viewpoints: [], group: 'safety-risk' },
                { name: 'RiskControlMeasure', label: 'Risk Control', construct: 'part', layer: 'assurance', instanceCount: 0, viewpoints: [], group: 'safety-risk' },
                { name: 'Vulnerability', label: 'Vulnerability', construct: 'item', layer: 'assurance', instanceCount: 0, viewpoints: [], group: 'cybersecurity' },
                { name: 'Requirement', label: 'Requirement', construct: 'requirement', layer: 'assurance', instanceCount: 0, viewpoints: [], group: 'requirements' },
            ],
        },
    ],
} as OntologyPackageInfo;

function el(id: string, kind: string, layer: string): MemoElement {
    return { id, name: id, kind, construct: 'part', layer, file: 'model/test.sysml', attributes: {} } as MemoElement;
}

function registryFromOntology(ontology: OntologyPackageInfo): KindDefinitionDTO[] {
    return ontology.layers.flatMap(layer => layer.kinds.map(kind => ({
        name: kind.name,
        label: kind.label,
        layer: kind.layer,
        construct: kind.construct,
        superType: kind.derivesFrom,
        isAbstract: kind.isAbstract,
        namespace: [layer.id, kind.group].filter((value): value is string => Boolean(value)),
    })));
}

/** All kind names across a group's constructs and their layers. */
function allKinds(group: { subGroups: { layers: { kinds: Map<string, unknown> }[] }[] }): string[] {
    return group.subGroups
        .flatMap(sub => sub.layers)
        .flatMap(layer => [...layer.kinds.keys()])
        .sort();
}

// ─── Containment ────────────────────────────────────────────────────────────
//
// A container in the explorer is a SysML package, and the tree is built from
// package membership. These hold down what that has to mean for the user: the
// branches are the model's own namespaces, an empty package is still a visible
// container, and one type folder shows a namespace once however many kinds
// contribute elements to it.

/** An element declared by a package. */
function inPackage(id: string, kind: string, layer: string, pkg?: string): MemoElement {
    return { ...el(id, kind, layer), ...(pkg ? { package: pkg } : {}) };
}

describe('buildTree', () => {
    it('nests elements under their package, splitting the qualified name', () => {
        const tree = buildTree([inPackage('h1', 'Hazard', 'risk', 'Plant::Hydraulics')]);

        expect(tree.map(node => node.id)).toEqual(['f:Plant']);
        const hydraulics = tree[0].children[0];
        expect(hydraulics).toMatchObject({ id: 'f:Plant::Hydraulics', name: 'Hydraulics', type: 'folder' });
        expect(hydraulics.children.map(child => child.id)).toEqual(['h1']);
    });

    it('shows a declared package that holds nothing', () => {
        const tree = buildTree([], [{ qualifiedName: 'Plant::Hydraulics' }]);

        expect(tree[0].children.map(node => node.name)).toEqual(['Hydraulics']);
        expect(tree[0].children[0].children).toEqual([]);
    });

    it('leaves an element with no package at the root', () => {
        const tree = buildTree([inPackage('h1', 'Hazard', 'risk')]);

        expect(tree.map(node => node.id)).toEqual(['h1']);
    });
});

describe('buildOwnershipTree', () => {
    it('nests owned port usages beneath their owning part', () => {
        const part = { ...el('pump', 'Pump', 'logical'), construct: 'part' as const };
        const port = { ...el('inlet', 'LogicalPort', 'functional'), construct: 'port' as const, owner: 'pump' };
        const tree = buildOwnershipTree([part, port]);
        expect(tree).toHaveLength(1);
        expect(tree[0].id).toBe('pump');
        expect(tree[0].children.map(child => child.id)).toEqual(['inlet']);
    });
});

describe('buildOwnerThenPackageTree', () => {
    it('nests a same-type child beneath its owner before considering packages', () => {
        const parent = { ...inPackage('doseControl', 'SystemFunction', 'functional', 'Functional'), name: 'Dose Control' };
        const child = { ...inPackage('enforceLimits', 'SystemFunction', 'functional', 'Functional'), name: 'Enforce Limits', owner: 'doseControl' };

        const tree = buildOwnerThenPackageTree([parent, child]);

        expect(tree.map(node => node.id)).toEqual(['f:Functional']);
        expect(tree[0].children.map(node => node.id)).toEqual(['doseControl']);
        expect(tree[0].children[0].children.map(node => node.id)).toEqual(['enforceLimits']);
    });

    it('uses packages only for roots without an owner', () => {
        const loose = { ...inPackage('acquire', 'SystemFunction', 'functional', 'Functional::Sensing'), name: 'Acquire Sensor Data' };

        const tree = buildOwnerThenPackageTree([loose]);

        expect(tree[0].id).toBe('f:Functional');
        expect(tree[0].children[0].id).toBe('f:Functional::Sensing');
        expect(tree[0].children[0].children.map(node => node.id)).toEqual(['acquire']);
    });
});



// ─── The four rules the explorer is built on ────────────────────────────────
//
// Each case names the rule it belongs to. The point of writing them this way
// is that none should ever need a special case added: a rule that needs an
// exception here is a rule that was wrong.
//
//   1. Domain first — architecture or assurance — then the SysML construct.
//   2. Inside a construct: layer → kind → parent/child.
//   3. A usage clubs under its def when a def exists; otherwise it takes its
//      own place. An element earns a row by being defined or used, except a
//      def the project authored, which is shown even when unused.
//   4. Relationships are edges, not rows; views and viewpoints are the
//      viewer's furniture and live in their own tab.
// ────────────────────────────────────────────────────────────────────────────

/** `el` with a construct of its own; the default helper is always a part. */
function elc(id: string, kind: string, layer: string, construct: string): MemoElement {
    return { ...el(id, kind, layer), construct } as MemoElement;
}

/** The construct ids inside one domain group. */
const constructs = (group: { subGroups: { id: string }[] }): string[] =>
    group.subGroups.map(sub => sub.id);

/** The layer ids inside one construct. */
const layersOf = (group: { subGroups: { id: string; layers: { id: string }[] }[] }, construct: string): string[] =>
    group.subGroups.find(sub => sub.id === construct)!.layers.map(layer => layer.id);

describe('computeExplorerGroupTree', () => {
    it('uses the required Artifacts child categories', () => {
        expect(artifactCategory('RiskManagementReport', 'DocumentArtifact')).toBe('documents');
        expect(artifactCategory('ScreenCapture', 'ModelOwnedArtifact')).toBe('assets');
        expect(artifactCategory('DocumentTemplate', 'ModelOwnedArtifact')).toBe('templates');
        expect(artifactCategory('AnalysisNotebook', 'ModelOwnedArtifact')).toBe('analyses');
        expect(artifactCategory('ADRArtifact', 'ModelOwnedArtifact')).toBe('adrs');
        expect(artifactCategory('DesignReview', 'ModelOwnedArtifact')).toBe('reviews');
    });

    // ─── Rule 1 ─────────────────────────────────────────────────────────────

    it('splits architecture from assurance before anything else', () => {
        // One Items branch could not say that InterfaceItem describes the
        // device and Hazard is a claim about it. The domain says it first.
        const groups = computeExplorerGroupTree([
            elc('ii1', 'InterfaceItem', 'logical', 'item'),
            elc('h1', 'Hazard', 'safety_risk', 'item'),
        ], '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        expect(groups.map(g => g.group.id)).toEqual(['domain:architecture', 'domain:assurance']);
        expect(groups[0].group.label).toBe('Architecture');
        expect(groups[1].group.label).toBe('Assurance');
    });

    it('makes the construct the category inside a domain', () => {
        const groups = computeExplorerGroupTree([
            elc('i1', 'Interface', 'logical', 'interface'),
            elc('p1', 'PhysicalPort', 'logical', 'port'),
            elc('a1', 'SystemFunction', 'functional', 'action'),
            elc('pt1', 'StateMachine', 'logical', 'part'),
        ], '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        expect(groups.map(g => g.group.id)).toEqual(['domain:architecture']);
        // EXPLORER_CONSTRUCT_ORDER, not insertion order or alphabetical.
        expect(constructs(groups[0])).toEqual(['part', 'action', 'port', 'interface']);
    });

    it('reads the domain from the layer when the ontology declares no kind', () => {
        // ItemDefinition and ActionDefinition are builder-synthesized and have
        // no namespace to read a domain from; without the layer fallback every
        // one of them would pile up outside both domains.
        const groups = computeExplorerGroupTree([
            elc('d1', 'ItemDefinition', 'behavior', 'item'),
            elc('d2', 'Vulnerability', 'cybersecurity', 'item'),
        ], '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        expect(groups.map(g => g.group.id)).toEqual(['domain:architecture', 'domain:assurance']);
    });

    it('files a layerless value type under Core, not Undefined', () => {
        // Enumerations are the only thing with no layer once views, viewpoints
        // and connections are excluded, and the ontology keeps them in
        // core/enumerations.
        const groups = computeExplorerGroupTree(
            [elc('e1', 'EnumerationDefinition', 'unknown', 'enumeration')],
            '', registryFromOntology(ONTOLOGY), [ONTOLOGY],
        );
        expect(groups.map(g => g.group.id)).toEqual(['domain:core']);
        expect(constructs(groups[0])).toEqual(['enumeration']);
    });

    // ─── Rule 2 ─────────────────────────────────────────────────────────────

    it('groups by layer inside a construct, in methodology order', () => {
        const groups = computeExplorerGroupTree([
            elc('h1', 'Hazard', 'safety_risk', 'item'),
            elc('v1', 'Vulnerability', 'cybersecurity', 'item'),
        ], '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        const assurance = groups.find(g => g.group.id === 'domain:assurance')!;
        // Safety Risk before Cybersecurity: EXPLORER_LAYER_ORDER, not alphabetical.
        expect(layersOf(assurance, 'item')).toEqual(['safety-risk', 'cybersecurity']);
    });

    it('reads safety_risk and safety-risk as one layer', () => {
        const groups = computeExplorerGroupTree([
            elc('h1', 'Hazard', 'safety_risk', 'item'),
            elc('h2', 'Hazard', 'safety-risk', 'item'),
        ], '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        expect(layersOf(groups[0], 'item')).toEqual(['safety-risk']);
    });

    it('adds no layer folder for a kind the builder left unnamed', () => {
        const groups = computeExplorerGroupTree(
            [elc('e1', 'EnumerationDefinition', 'unknown', 'enumeration')],
            '', registryFromOntology(ONTOLOGY), [ONTOLOGY],
        );
        expect(layersOf(groups[0], 'enumeration')).toEqual(['']);
    });

    it('keeps fork and join in their own folders with no rule naming them', () => {
        // The objection this answers was that fork/join would land among the
        // functions. Strict-kind grouping prevents it — no exclusion needed.
        const groups = computeExplorerGroupTree([
            elc('f1', 'ForkNode', 'behavior', 'action'),
            elc('j1', 'JoinNode', 'behavior', 'action'),
            elc('fn1', 'SystemFunction', 'functional', 'action'),
        ], '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        const actions = groups[0].subGroups.find(sub => sub.id === 'action')!;
        const behavior = actions.layers.find(layer => layer.id === 'behavior')!;
        expect([...behavior.kinds.keys()].sort()).toEqual(['ForkNode', 'JoinNode']);
        expect(actions.layers.find(layer => layer.id === 'functional')).toBeDefined();
    });

    it('does not nest concrete kinds under abstract ontology bases', () => {
        const withAbstractBase: OntologyPackageInfo = {
            ...ONTOLOGY,
            layers: [{
                ...ONTOLOGY.layers[0],
                kinds: [
                    { name: 'AbstractRisk', label: 'Abstract Risk', construct: 'part', layer: 'architecture', instanceCount: 0, viewpoints: [], group: 'safety-risk', isAbstract: true },
                    { name: 'ResidualRisk', label: 'Residual Risk', construct: 'part', layer: 'architecture', instanceCount: 0, viewpoints: [], group: 'safety-risk', derivesFrom: 'AbstractRisk' },
                ],
            }],
        } as OntologyPackageInfo;
        const groups = computeExplorerGroupTree(
            [elc('rr1', 'ResidualRisk', 'safety_risk', 'part')], '', registryFromOntology(withAbstractBase), [withAbstractBase],
        );
        const risk = groups[0].subGroups[0].layers.find(layer => layer.id === 'safety-risk')!;
        expect(risk.kinds.has('ResidualRisk')).toBe(true);
        expect(risk.kinds.has('AbstractRisk')).toBe(false);
    });

    it('folds native SysML activity notation into the construct it belongs to', () => {
        // These used to get a branch of their own, "Other — SysML Diagram
        // Elements". An ActionUsage is an action; rule 1 admits no such
        // category, and rule 2 already keeps the kinds apart.
        const groups = computeExplorerGroupTree([
            elc('receive', 'AcceptActionUsage', 'behavior', 'action'),
            elc('route', 'DecisionNodeUsage', 'behavior', 'action'),
        ], '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        expect(groups.map(g => g.group.id)).toEqual(['domain:architecture']);
        expect(allKinds(groups[0])).toEqual(['AcceptActionUsage', 'DecisionNodeUsage']);
    });

    // ─── Rule 3 ─────────────────────────────────────────────────────────────

    it('hides an ontology-kind definition that nothing uses', () => {
        const groups = computeExplorerGroupTree(
            [{ ...elc('h1', 'Hazard', 'safety_risk', 'item'), isDefinition: true } as MemoElement],
            '', registryFromOntology(ONTOLOGY), [ONTOLOGY],
        );
        expect(groups).toEqual([]);
    });

    it('shows an unused definition the project authored itself', () => {
        // A function def the conversion has written but not yet used is work
        // in progress, not clutter. The ontology does not declare its kind, so
        // nothing else in the tool lists it — hiding it hides the work.
        const groups = computeExplorerGroupTree(
            [{ ...elc('ManageMappingCases', 'ActionDefinition', 'functional', 'action'), isDefinition: true } as MemoElement],
            '', registryFromOntology(ONTOLOGY), [ONTOLOGY],
        );
        expect(groups.map(g => g.group.id)).toEqual(['domain:architecture']);
        expect(allKinds(groups[0])).toEqual(['ActionDefinition']);
    });

    it('shows an ontology-kind definition as soon as something uses it', () => {
        const groups = computeExplorerGroupTree([
            { ...elc('Hazard1', 'Hazard', 'safety_risk', 'item'), isDefinition: true } as MemoElement,
            { ...elc('h1', 'Hazard', 'safety_risk', 'item'), attributes: { usageType: 'Hazard1' } } as MemoElement,
        ], '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        expect(groups.map(g => g.group.id)).toEqual(['domain:assurance']);
    });

    it('shows a usage whose type is not in the model at all', () => {
        // Rule 3's second half: a usage clubs under its def WHEN ONE EXISTS.
        // A dangling type is not a reason to swallow the row — the folder
        // naming the missing type is how the gap becomes visible.
        const groups = computeExplorerGroupTree([
            { ...elc('usbHost', 'UsbConnectorPort', 'logical', 'port'), attributes: { usageType: 'UsbConnectorPort' } } as MemoElement,
        ], '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        expect(allKinds(groups[0])).toEqual(['UsbConnectorPort']);
        const rows = groups[0].subGroups[0].layers[0].kinds.get('UsbConnectorPort')!;
        expect(rows.map(node => node.id)).toEqual(['usbHost']);
    });

    // ─── Rule 4 ─────────────────────────────────────────────────────────────

    it('lists no connection: a relationship is an edge, not a row', () => {
        // Affera declares nineteen MemoRelationship definitions — Composes,
        // DeploysOnto, RealizesInterface. They are the edge vocabulary, and
        // listing them put the relationship types beside the model's parts.
        const groups = computeExplorerGroupTree([
            elc('Composes', 'MemoRelationship', 'unknown', 'connection'),
            elc('p1', 'PhysicalPort', 'logical', 'port'),
        ], '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        expect(constructs(groups[0])).toEqual(['port']);
    });

    it('lists no view or viewpoint: they are the viewer\'s own furniture', () => {
        // The exclusion reaches everything declared in a view's file, not just
        // the view, so the port has to live elsewhere to survive it.
        const groups = computeExplorerGroupTree([
            { ...elc('v1', 'MemoDiagramView', 'unknown', 'view'), file: 'model/views.sysml' } as MemoElement,
            elc('p1', 'PhysicalPort', 'logical', 'port'),
        ], '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        expect(constructs(groups[0])).toEqual(['port']);
    });
});

describe('grouping by elementPackage', () => {
    const grouped = (id: string, packageName?: string): MemoElement => {
        const base = el(id, 'Requirement', 'requirements');
        return packageName
            ? { ...base, attributes: { elementPackage: packageName } } as MemoElement
            : base;
    };

    const kindNodes = (elements: MemoElement[]) =>
        computeExplorerGroupTree(elements, '', registryFromOntology(ONTOLOGY), [ONTOLOGY])
            .flatMap(group => group.subGroups)
            .flatMap(subGroup => subGroup.layers)
            .flatMap(layer => [...layer.kinds.values()])
            .flat();

    // SysML lets a package group members inside a usage body, and the builder
    // records which one an element landed in. The Catalog used to flatten them
    // all under their kind, so the grouping the author wrote was invisible.
    it('folds elements into a folder per grouping package', () => {
        const nodes = kindNodes([
            grouped('loose'),
            grouped('header1', 'grpHeader'),
            grouped('footer1', 'grpFooter'),
            grouped('header2', 'grpHeader'),
        ]);

        const header = nodes.find(node => node.name === 'grpHeader');
        const footer = nodes.find(node => node.name === 'grpFooter');
        expect(header?.type).toBe('folder');
        expect(header?.children.map(child => child.element?.id)).toEqual(['header1', 'header2']);
        expect(footer?.children.map(child => child.element?.id)).toEqual(['footer1']);
    });

    // A kind is usually mostly ungrouped; sinking those below the folders would
    // reorder the common case to serve the rare one.
    it('leaves an ungrouped element a sibling of the folders, not inside one', () => {
        const nodes = kindNodes([grouped('loose'), grouped('header1', 'grpHeader')]);

        expect(nodes.some(node => node.element?.id === 'loose')).toBe(true);
        const header = nodes.find(node => node.name === 'grpHeader');
        expect(header?.children.some(child => child.element?.id === 'loose')).toBe(false);
    });

    it('leaves a kind untouched when nothing declares a grouping package', () => {
        const nodes = kindNodes([grouped('a'), grouped('b')]);

        expect(nodes.every(node => node.type === 'element')).toBe(true);
    });
});
