import { describe, it, expect } from 'vitest';
import { artifactCategory, buildOwnershipTree, buildTree, computeExplorerGroupTree } from '../ExplorerPanel';
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
        const part = { ...el('pump', 'Pump', 'logical'), construct: 'part' };
        const port = { ...el('inlet', 'LogicalPort', 'functional'), construct: 'port', owner: 'pump' };
        const tree = buildOwnershipTree([part, port]);
        expect(tree).toHaveLength(1);
        expect(tree[0].id).toBe('pump');
        expect(tree[0].children.map(child => child.id)).toEqual(['inlet']);
    });
});

describe('computeExplorerGroupTree containment', () => {
    it('shows a namespace once per type folder, not once per contributing kind', () => {
        // Both kinds sit in the same sub-group and the same package; a tree
        // built per kind and concatenated showed "Plant" twice.
        const elements = [
            inPackage('h1', 'Hazard', 'risk', 'Plant'),
            inPackage('rc1', 'RiskControlMeasure', 'risk', 'Plant'),
        ];
        const groups = computeExplorerGroupTree(elements, '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        const risk = groups[0].subGroups.find(sg => sg.id === 'safety-risk')!;

        for (const nodes of risk.kinds.values()) {
            expect(nodes.filter(node => node.id === 'f:Plant')).toHaveLength(1);
        }
    });

    it('does not clone empty packages into a type tree', () => {
        const groups = computeExplorerGroupTree(
            [inPackage('h1', 'Hazard', 'risk', 'Plant')], '',
            registryFromOntology(ONTOLOGY), [ONTOLOGY],
            [{ qualifiedName: 'Plant' }, { qualifiedName: 'Spares' }],
        );
        const risk = groups[0].subGroups.find(sg => sg.id === 'safety-risk')!;
        const hazards = risk.kinds.get('Hazard')!;

        expect(hazards.map(node => node.id)).toEqual(['f:Plant']);
    });
});

describe('computeExplorerGroupTree', () => {
    it('uses the required Artifacts child categories', () => {
        expect(artifactCategory('RiskManagementReport', 'DocumentArtifact')).toBe('documents');
        expect(artifactCategory('ScreenCapture', 'ModelOwnedArtifact')).toBe('assets');
        expect(artifactCategory('DocumentTemplate', 'ModelOwnedArtifact')).toBe('templates');
        expect(artifactCategory('AnalysisNotebook', 'ModelOwnedArtifact')).toBe('analyses');
        expect(artifactCategory('ADRArtifact', 'ModelOwnedArtifact')).toBe('adrs');
        expect(artifactCategory('DesignReview', 'ModelOwnedArtifact')).toBe('reviews');
    });
    it('groups ontology-declared kinds under their package layer', () => {
        const groups = computeExplorerGroupTree(
            [el('h1', 'Hazard', 'risk')], '', registryFromOntology(ONTOLOGY), [ONTOLOGY],
        );
        expect(groups.map(g => g.group.id)).toEqual(['architecture']);
    });

    it('maps package sub-groups into V-model layers and assurance disciplines', () => {
        const elements = [
            el('h1', 'Hazard', 'risk'),
            el('rc1', 'RiskControlMeasure', 'risk'),
            el('r1', 'Requirement', 'requirements'),
            el('bm1', 'StateMachine', 'architecture'),
        ];
        const groups = computeExplorerGroupTree(elements, '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        const arch = groups.find(g => g.group.id === 'architecture');
        expect(arch).toBeDefined();
        expect(arch!.subGroups.map(sg => sg.id)).toEqual(['functional', 'requirements', 'safety-risk']);
        const risk = arch!.subGroups.find(sg => sg.id === 'safety-risk')!;
        expect(risk.label).toBe('Safety Risk');
        expect([...risk.kinds.keys()].sort()).toEqual(['Hazard', 'RiskControlMeasure']);
        const functional = arch!.subGroups.find(sg => sg.id === 'functional')!;
        expect([...functional.kinds.keys()]).toEqual(['StateMachine']);
    });

    it('groups native SysML activity notation separately from ontology elements', () => {
        const elements = [
            el('AcquireSensorData', 'ActionDefinition', 'behavior'),
            el('acquireSensors', 'ActionUsage', 'behavior'),
            el('SensorStatusVector', 'ItemDefinition', 'behavior'),
        ];
        const groups = computeExplorerGroupTree(elements, '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        expect(groups.map(group => group.group.id)).toEqual(['standard-sysml-diagram-elements']);
        expect(groups[0]!.subGroups.map(group => group.id)).toEqual(['diagram-elements']);
        expect(allKinds(groups[0]!)).toEqual(['ActionDefinition', 'ActionUsage']);
    });

    it('still flags genuinely unknown kinds as Undefined', () => {
        const groups = computeExplorerGroupTree(
            [el('x1', 'MysteryKind', 'unknown')], '', registryFromOntology(ONTOLOGY), [ONTOLOGY],
        );
        expect(groups.map(g => g.group.id)).toEqual(['undefined']);
    });

    it('keeps native SysML notation and genuinely unknown kinds separate', () => {
        const groups = computeExplorerGroupTree([
            el('receive', 'AcceptActionUsage', 'behavior'),
            el('route', 'DecisionNodeUsage', 'behavior'),
            el('mystery', 'MysteryKind', 'unknown'),
        ], '', registryFromOntology(ONTOLOGY), [ONTOLOGY]);
        expect(groups.map(group => group.group.id)).toEqual([
            'standard-sysml-diagram-elements', 'undefined',
        ]);
        expect(groups[0]!.subGroups.map(group => group.id)).toEqual(['diagram-elements']);
        expect(allKinds(groups[0]!)).toEqual(['AcceptActionUsage', 'DecisionNodeUsage']);
        expect(allKinds(groups[1]!)).toEqual(['MysteryKind']);
    });

    it('uses the complete ontology registry instead of an incomplete UI package projection', () => {
        const registry: KindDefinitionDTO[] = [
            ...registryFromOntology(ONTOLOGY),
            {
                name: 'FMEAWorksheet',
                label: 'FMEA Worksheet',
                layer: 'safety_risk',
                construct: 'item def',
                superType: 'AnalysisArtifact',
                namespace: ['assurance', 'safety_risk', 'analysis'],
            },
        ];
        const groups = computeExplorerGroupTree(
            [el('fmea', 'FMEAWorksheet', 'safety_risk')],
            '',
            registry,
            [ONTOLOGY],
        );

        expect(groups.map(group => group.group.id)).toEqual(['assurance']);
        expect(groups.some(group => group.group.id === 'undefined')).toBe(false);
        expect(groups[0].subGroups.map(group => group.id)).toEqual(['safety_risk']);
    });

    it('accepts MEMO-derived canonical types instead of marking them undefined', () => {
        const memoOntology: OntologyPackageInfo = {
            ...ONTOLOGY,
            layers: [{
                id: 'architecture', label: 'Architecture', color: '#7B68EE', kindCount: 2,
                kinds: [
                    { name: 'User', label: 'User', construct: 'part def', layer: 'architecture', instanceCount: 0, viewpoints: [], group: 'operational', derivesFrom: 'Actor' },
                    { name: 'HardwareAssembly', label: 'Hardware Assembly', construct: 'part def', layer: 'architecture', instanceCount: 0, viewpoints: [], group: 'implementation', derivesFrom: 'PhysicalAssembly' },
                ],
            }],
        } as OntologyPackageInfo;
        const groups = computeExplorerGroupTree([
            el('user', 'User', 'context'),
            el('assembly', 'HardwareAssembly', 'implementation'),
        ], '', registryFromOntology(memoOntology), [memoOntology]);
        expect(groups.map(group => group.group.id)).toEqual(['architecture']);
        // The concrete elements nest below their ontology bases; critically,
        // they stay in the MEMO architecture group rather than Undefined.
        expect(allKinds(groups[0])).toEqual(['Actor', 'PhysicalAssembly']);
    });

    it('uses an ontology-declared native kind in its declared layer', () => {
        const withAction: OntologyPackageInfo = {
            ...ONTOLOGY,
            layers: [
                {
                    ...ONTOLOGY.layers[0],
                    kinds: [
                        ...ONTOLOGY.layers[0].kinds,
                        { name: 'ActionDefinition', label: 'Action Definition', construct: 'action', layer: 'architecture', instanceCount: 0, viewpoints: [] },
                    ],
                },
            ],
        } as OntologyPackageInfo;
        const groups = computeExplorerGroupTree(
            [el('a1', 'ActionDefinition', 'behavior')], '', registryFromOntology(withAction), [withAction],
        );
        expect(groups.map(group => group.group.id)).toEqual(['architecture']);
        expect(allKinds(groups[0]!)).toEqual(['ActionDefinition']);
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
            [el('rr1', 'ResidualRisk', 'risk')], '', registryFromOntology(withAbstractBase), [withAbstractBase],
        );
        const risk = groups[0].subGroups.find(group => group.id === 'safety-risk')!;
        expect(risk.kinds.has('ResidualRisk')).toBe(true);
        expect(risk.kinds.has('AbstractRisk')).toBe(false);
    });
});
