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
            el('rc1', 'RiskControlMeasure', 'risk'),
            el('r1', 'Requirement', 'requirements'),
            el('bm1', 'StateMachine', 'architecture'),
        ];
        const groups = computeExplorerGroupTree(elements, '', [ONTOLOGY], SELECTED);
        const arch = groups.find(g => g.group.id === 'architecture');
        expect(arch).toBeDefined();
        expect(arch!.subGroups.map(sg => sg.id)).toEqual(['functional', 'requirements', 'safety-risk']);
        const risk = arch!.subGroups.find(sg => sg.id === 'safety-risk')!;
        expect(risk.label).toBe('Safety Risk');
        expect([...risk.kinds.keys()].sort()).toEqual(['Hazard', 'RiskControlMeasure']);
        const functional = arch!.subGroups.find(sg => sg.id === 'functional')!;
        expect([...functional.kinds.keys()]).toEqual(['StateMachine']);
    });

    it('keeps untyped action-flow notation out of the architecture Explorer', () => {
        const elements = [
            el('AcquireSensorData', 'ActionDefinition', 'behavior'),
            el('acquireSensors', 'ActionUsage', 'behavior'),
            el('SensorStatusVector', 'ItemDefinition', 'behavior'),
        ];
        const groups = computeExplorerGroupTree(elements, '', [ONTOLOGY], SELECTED);
        expect(groups).toEqual([]);
    });

    it('still flags genuinely unknown kinds as Undefined', () => {
        const groups = computeExplorerGroupTree([el('x1', 'MysteryKind', 'unknown')], '', [ONTOLOGY], SELECTED);
        expect(groups.map(g => g.group.id)).toEqual(['undefined']);
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
        ], '', [memoOntology], SELECTED);
        expect(groups.map(group => group.group.id)).toEqual(['architecture']);
        // The concrete elements nest below their ontology bases; critically,
        // they stay in the MEMO architecture group rather than Undefined.
        expect(allKinds(groups[0])).toEqual(['Actor', 'PhysicalAssembly']);
    });

    it('keeps generic action notation out of Explorer even when it is declared', () => {
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
        expect(groups).toEqual([]);
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
        const groups = computeExplorerGroupTree([el('rr1', 'ResidualRisk', 'risk')], '', [withAbstractBase], SELECTED);
        const risk = groups[0].subGroups.find(group => group.id === 'safety-risk')!;
        expect(risk.kinds.has('ResidualRisk')).toBe(true);
        expect(risk.kinds.has('AbstractRisk')).toBe(false);
    });
});
