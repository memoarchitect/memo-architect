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
            kindCount: 4,
            kinds: [
                { name: 'StateMachine', label: 'State Machine', construct: 'part', layer: 'architecture', instanceCount: 0, viewpoints: [], group: 'functional' },
                { name: 'Hazard', label: 'Hazard', construct: 'item', layer: 'architecture', instanceCount: 0, viewpoints: [], group: 'safety-risk' },
                { name: 'RiskControlMeasure', label: 'Risk Control', construct: 'part', layer: 'architecture', instanceCount: 0, viewpoints: [], group: 'safety-risk' },
                { name: 'Requirement', label: 'Requirement', construct: 'requirement', layer: 'architecture', instanceCount: 0, viewpoints: [], group: 'requirements' },
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

/** All kind names across a group's sub-groups. */
function allKinds(group: { subGroups: { kinds: Map<string, unknown> }[] }): string[] {
    return group.subGroups.flatMap(sg => [...sg.kinds.keys()]).sort();
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



// ─── Rule 1: the construct is the category ──────────────────────────────────
//
// These hold down the four rules the explorer is built on, and each names the
// rule it belongs to. The point of writing them this way is that none of them
// should ever need a special case added: a rule that needs an exception here
// is a rule that was wrong.
//
//   1. Top-level category = SysML construct.
//   2. Inside a category: layer → kind → parent/child.
//   3. A usage clubs under its def when a def exists; otherwise it takes its
//      own place. The explorer holds no opinion about what ought to have defs.
//   4. Relationships are edges, not rows; views and viewpoints are the
//      viewer's furniture and live in their own tab.
// ────────────────────────────────────────────────────────────────────────────

/** `el` with a construct of its own; the default helper is always a part. */
function elc(id: string, kind: string, layer: string, construct: string): MemoElement {
    return { ...el(id, kind, layer), construct } as MemoElement;
}

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

    it('files an element under its construct, not under its ontology package', () => {
        const groups = computeExplorerGroupTree(
            [elc('h1', 'Hazard', 'safety_risk', 'item')], '', registryFromOntology(ONTOLOGY), [ONTOLOGY],
        );
        expect(groups.map(g => g.group.id)).toEqual(['construct:item']);
        expect(groups[0].group.label).toBe('Items');
    });

    it('gives every construct its own category without deciding which deserve one', () => {
        // Interfaces are separate for the same reason ports are: interface is
        // a construct. Neither needed a judgement, and the order is the one
        // EXPLORER_CONSTRUCT_ORDER declares rather than insertion order.
        const groups = computeExplorerGroupTree([
            elc('i1', 'Interface', 'logical', 'interface'),
            elc('p1', 'PhysicalPort', 'logical', 'port'),
            elc('a1', 'SystemFunction', 'functional', 'action'),
            elc('pt1', 'StateMachine', 'architecture', 'part'),
        ], '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        expect(groups.map(g => g.group.id)).toEqual([
            'construct:part', 'construct:action', 'construct:port', 'construct:interface',
        ]);
    });

    it('keeps an element whose kind the ontology never declared out of Undefined', () => {
        // Every element has a construct even when its kind is unknown, so it
        // lands somewhere predictable. Only a missing CONSTRUCT is a finding.
        const groups = computeExplorerGroupTree(
            [elc('x1', 'MysteryKind', 'logical', 'part')], '', registryFromOntology(ONTOLOGY), [ONTOLOGY],
        );
        expect(groups.map(g => g.group.id)).toEqual(['construct:part']);
        expect(allKinds(groups[0])).toEqual(['MysteryKind']);
    });

    it('flags an element the builder gave no construct, rather than dropping it', () => {
        const groups = computeExplorerGroupTree(
            [{ ...el('x1', 'MysteryKind', 'unknown'), construct: '' } as MemoElement],
            '', registryFromOntology(ONTOLOGY), [ONTOLOGY],
        );
        expect(groups.map(g => g.group.id)).toEqual(['undefined']);
    });

    // ─── Rule 2 ─────────────────────────────────────────────────────────────

    it('groups by layer inside a construct, in methodology order', () => {
        const groups = computeExplorerGroupTree([
            elc('h1', 'Hazard', 'safety_risk', 'item'),
            elc('rc1', 'RiskControlMeasure', 'safety_risk', 'item'),
            elc('ii1', 'InterfaceItem', 'logical', 'item'),
        ], '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        const items = groups.find(g => g.group.id === 'construct:item')!;
        // Logical before Safety Risk: EXPLORER_LAYER_ORDER, not alphabetical.
        expect(items.subGroups.map(sg => sg.id)).toEqual(['logical', 'safety-risk']);
        const risk = items.subGroups.find(sg => sg.id === 'safety-risk')!;
        expect([...risk.kinds.keys()].sort()).toEqual(['Hazard', 'RiskControlMeasure']);
    });

    it('reads safety_risk and safety-risk as one layer', () => {
        const groups = computeExplorerGroupTree([
            elc('h1', 'Hazard', 'safety_risk', 'item'),
            elc('h2', 'Hazard', 'safety-risk', 'item'),
        ], '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        expect(groups[0].subGroups.map(sg => sg.id)).toEqual(['safety-risk']);
    });

    it('does not invent a layer folder for a kind the builder left unknown', () => {
        // All five of Affera's enumerations report `layer: unknown`. Under the
        // old layer-first tree that stranded them in "Undefined"; a folder
        // called Unknown would be no better, so they sit under the construct.
        const groups = computeExplorerGroupTree(
            [elc('e1', 'EnumerationDefinition', 'unknown', 'enumeration')],
            '', registryFromOntology(ONTOLOGY), [ONTOLOGY],
        );
        expect(groups.map(g => g.group.id)).toEqual(['construct:enumeration']);
        expect(groups[0].subGroups.map(sg => sg.id)).toEqual(['']);
    });

    it('keeps fork and join in their own folders with no rule naming them', () => {
        // The objection this answers was that fork/join would land among the
        // functions. Strict-kind grouping is what prevents it — no exclusion.
        const groups = computeExplorerGroupTree([
            elc('f1', 'ForkNode', 'behavior', 'action'),
            elc('j1', 'JoinNode', 'behavior', 'action'),
            elc('fn1', 'SystemFunction', 'functional', 'action'),
        ], '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        const actions = groups.find(g => g.group.id === 'construct:action')!;
        const behavior = actions.subGroups.find(sg => sg.id === 'behavior')!;
        expect([...behavior.kinds.keys()].sort()).toEqual(['ForkNode', 'JoinNode']);
        expect(actions.subGroups.find(sg => sg.id === 'functional')).toBeDefined();
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
        const risk = groups[0].subGroups.find(group => group.id === 'safety-risk')!;
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
        expect(groups.map(group => group.group.id)).toEqual(['construct:action']);
        expect(allKinds(groups[0])).toEqual(['AcceptActionUsage', 'DecisionNodeUsage']);
    });

    // ─── Rule 3 ─────────────────────────────────────────────────────────────

    it('hides an ontology-kind definition that nothing uses', () => {
        // Not defined and not used is not a row. The ontology already lists
        // the kind, so an unused one is a Definitions-tab finding.
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
        expect(groups.map(g => g.group.id)).toEqual(['construct:action']);
        expect(allKinds(groups[0])).toEqual(['ActionDefinition']);
    });

    it('shows an ontology-kind definition as soon as something uses it', () => {
        const groups = computeExplorerGroupTree([
            { ...elc('Hazard1', 'Hazard', 'safety_risk', 'item'), isDefinition: true } as MemoElement,
            { ...elc('h1', 'Hazard', 'safety_risk', 'item'), attributes: { usageType: 'Hazard1' } } as MemoElement,
        ], '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        expect(groups.map(g => g.group.id)).toEqual(['construct:item']);
    });

    it('shows an untyped ItemDefinition instead of hiding it', () => {
        // 394 of Affera's 440 were untyped usages in an architecture layer,
        // which is the gap "architecture defines, assurance states" exists to
        // surface. Hiding the kind hid the finding.
        const groups = computeExplorerGroupTree(
            [elc('SensorStatusVector', 'ItemDefinition', 'behavior', 'item')],
            '', registryFromOntology(ONTOLOGY), [ONTOLOGY],
        );
        expect(groups.map(g => g.group.id)).toEqual(['construct:item']);
        expect(allKinds(groups[0])).toEqual(['ItemDefinition']);
    });

    it('shows a usage whose type is not in the model at all', () => {
        // Rule 3's second half: a usage clubs under its def WHEN ONE EXISTS.
        // A dangling type is not a reason to swallow the row — the reader
        // needs to see the usage, and the folder naming the missing type is
        // how the gap becomes visible instead of silent.
        const groups = computeExplorerGroupTree([
            { ...elc('usbHost', 'UsbConnectorPort', 'logical', 'port'), attributes: { usageType: 'UsbConnectorPort' } } as MemoElement,
        ], '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        expect(groups.map(g => g.group.id)).toEqual(['construct:port']);
        expect(allKinds(groups[0])).toEqual(['UsbConnectorPort']);
        const rows = [...groups[0].subGroups[0].kinds.get('UsbConnectorPort')!];
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
        expect(groups.map(g => g.group.id)).toEqual(['construct:port']);
    });

    it('lists no view or viewpoint: they are the viewer\'s own furniture', () => {
        // The exclusion reaches everything declared in a view's file, not just
        // the view, so the port has to live somewhere else to survive it.
        const groups = computeExplorerGroupTree([
            { ...elc('v1', 'MemoDiagramView', 'unknown', 'view'), file: 'model/views.sysml' } as MemoElement,
            elc('p1', 'PhysicalPort', 'logical', 'port'),
        ], '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        expect(groups.map(g => g.group.id)).toEqual(['construct:port']);
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
            .flatMap(subGroup => [...subGroup.kinds.values()])
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
