import { describe, it, expect } from 'vitest';
import { computeExplorerGroupTree } from '../ExplorerPanel';
import type { MemoElement } from '@memoarchitect/tools/browser';
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
                { name: 'BehaviorMachine', label: 'Behavior Machine', construct: 'part', layer: 'architecture', instanceCount: 0, viewpoints: [], group: 'behavior' },
                { name: 'Hazard', label: 'Hazard', construct: 'item', layer: 'architecture', instanceCount: 0, viewpoints: [], group: 'risk' },
                { name: 'RiskControl', label: 'Risk Control', construct: 'part', layer: 'architecture', instanceCount: 0, viewpoints: [], group: 'risk' },
                { name: 'Requirement', label: 'Requirement', construct: 'requirement', layer: 'architecture', instanceCount: 0, viewpoints: [], group: 'requirements' },
            ],
        },
    ],
} as OntologyPackageInfo;

function el(id: string, kind: string, layer: string): MemoElement {
    return { id, name: id, kind, construct: 'part', layer, file: 'model/test.sysml', attributes: {} } as MemoElement;
}

const SELECTED = new Set(['@memoarchitect/ontology']);

/** All kind names across a group's sub-groups. */
function allKinds(group: { subGroups: { kinds: Map<string, unknown> }[] }): string[] {
    return group.subGroups.flatMap(sg => [...sg.kinds.keys()]).sort();
}

describe('computeExplorerGroupTree', () => {
    it('groups ontology-declared kinds under their package layer', () => {
        const groups = computeExplorerGroupTree([el('h1', 'Hazard', 'risk')], '', [ONTOLOGY], SELECTED);
        expect(groups.map(g => g.group.id)).toEqual(['architecture']);
    });

    it('maps package sub-groups into V-model layers and assurance disciplines', () => {
        const elements = [
            el('h1', 'Hazard', 'risk'),
            el('rc1', 'RiskControl', 'risk'),
            el('r1', 'Requirement', 'requirements'),
            el('bm1', 'BehaviorMachine', 'architecture'),
        ];
        const groups = computeExplorerGroupTree(elements, '', [ONTOLOGY], SELECTED);
        const arch = groups.find(g => g.group.id === 'architecture');
        expect(arch).toBeDefined();
        expect(arch!.subGroups.map(sg => sg.id)).toEqual(['functional', 'requirements', 'safety-risk']);
        const risk = arch!.subGroups.find(sg => sg.id === 'safety-risk')!;
        expect(risk.label).toBe('Safety / Risk');
        expect([...risk.kinds.keys()].sort()).toEqual(['Hazard', 'RiskControl']);
        const functional = arch!.subGroups.find(sg => sg.id === 'functional')!;
        expect([...functional.kinds.keys()]).toEqual(['BehaviorMachine']);
    });

    it('groups builder-synthesized action/item kinds under Architecture → Functional, not Undefined', () => {
        const elements = [
            el('AcquireSensorData', 'ActionDefinition', 'behavior'),
            el('acquireSensors', 'ActionUsage', 'behavior'),
            el('SensorStatusVector', 'ItemDefinition', 'behavior'),
        ];
        const groups = computeExplorerGroupTree(elements, '', [ONTOLOGY], SELECTED);
        const architecture = groups.find(g => g.group.id === 'architecture');
        expect(architecture).toBeDefined();
        const functional = architecture!.subGroups.find(sg => sg.id === 'functional');
        expect(functional).toBeDefined();
        expect(allKinds({ ...architecture!, subGroups: [functional!] })).toEqual(['ActionDefinition', 'ActionUsage', 'ItemDefinition']);
        expect(groups.find(g => g.group.id === 'undefined')).toBeUndefined();
    });

    it('still flags genuinely unknown kinds as Undefined', () => {
        const groups = computeExplorerGroupTree([el('x1', 'MysteryKind', 'unknown')], '', [ONTOLOGY], SELECTED);
        expect(groups.map(g => g.group.id)).toEqual(['undefined']);
    });

    it('prefers an ontology-declared kind over the synthesized fallback', () => {
        // If a package someday declares ActionDefinition, the ontology layer wins.
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
        const groups = computeExplorerGroupTree([el('a1', 'ActionDefinition', 'behavior')], '', [withAction], SELECTED);
        expect(groups.map(g => g.group.id)).toEqual(['architecture']);
    });
});
