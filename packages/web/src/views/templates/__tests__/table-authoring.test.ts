import { describe, expect, it } from 'vitest';
import type { MemoElement, MemoModelDTO, MemoRelationship, OntologyRegistriesDTO, RelationshipDefinitionDTO, RelationshipEndScopes } from '@memoarchitect/tools/browser';
import { buildFlowTableTree } from '../bdd-table';
import {
    childKindOptions, declaredNameFor, defaultPlacement, linkCategory, placementWrites, linksByRow, rowLinkCategories, rowMayHold, targetMayHold, viewInsertionPoint,
} from '../table-authoring';

const end = (name: string, type?: string) => ({ name, ...(type ? { type } : {}) });
const relation = (sysmlName: string, source?: string, target?: string, extra: Partial<RelationshipDefinitionDTO> = {}): RelationshipDefinitionDTO => ({
    name: sysmlName.charAt(0).toLowerCase() + sysmlName.slice(1), sysmlName, label: sysmlName, layer: 'core',
    sourceEnd: end('source', source), targetEnd: end('target', target), ...extra,
});
const kind = (name: string, construct: string, layer: string, superType?: string, extra = {}) => ({ name, label: name, construct, layer, superType, ...extra });

const registries: OntologyRegistriesDTO = {
    kinds: [
        kind('MemoPart', 'part def', 'core', undefined, { isAbstract: true }),
        kind('LogicalComponent', 'part def', 'logical', 'MemoPart'),
        kind('Subsystem', 'part def', 'logical', 'LogicalComponent'),
        kind('SoftwareModule', 'part def', 'implementation', 'MemoPart'),
        kind('MemoAction', 'action def', 'core'),
        kind('OperativeAction', 'action def', 'operational', 'MemoAction'),
        kind('OperativeScenario', 'action def', 'operational', 'MemoAction'),
        kind('SystemFunction', 'action def', 'functional', 'MemoAction'),
        kind('MemoRequirementElement', 'requirement def', 'core', undefined, { isAbstract: true }),
        kind('Requirement', 'requirement def', 'requirements', 'MemoRequirementElement'),
        kind('RiskItem', 'item def', 'risk', undefined, { isAbstract: true }),
        kind('Hazard', 'item def', 'risk', 'RiskItem'),
        kind('ProjectStep', 'action def', 'operational', 'OperativeAction', { origin: 'project' }),
    ],
    relationships: [
        relation('AllocatedTo', undefined, undefined, { nativeKeyword: 'allocate' }),
        relation('SatisfiedBy', 'MemoRequirementElement', undefined, { nativeKeyword: 'satisfy', isTrace: true }),
        relation('Mitigates', undefined, 'RiskItem', { isTrace: true }),
        relation('HasFailureMode', 'MemoPart', 'Hazard', { isTrace: true }),
        relation('VerifiedBy', undefined, 'Requirement', { nativeKeyword: 'verify', isTrace: true }),
        relation('HostedBy', 'MemoPart', 'MemoPart'),
        relation('Composes', undefined, undefined, { nativeKeyword: 'nesting' }),
        relation('MemoLink'),
        relation('FunctionalTransfer', undefined, undefined, { sysmlConstruct: 'flow def' }),
    ],
};
const definition = (sysmlName: string) => registries.relationships.find(item => item.sysmlName === sysmlName)!;

const el = (id: string, kindName: string, construct: string, extra: Partial<MemoElement> = {}): MemoElement => ({
    id, name: id.split('::').pop()!, kind: kindName, construct, layer: 'logical', file: 'm.sysml', attributes: {}, ...extra,
} as MemoElement);
const link = (type: string, sourceId: string, targetId: string): MemoRelationship => ({
    id: `${type}:${sourceId}:${targetId}`, type, sourceId, targetId, sourceEnd: '', targetEnd: '', file: 'm.sysml',
});

// What the ontology's rules on allocation refuse, as the server reports it.
const scopes: RelationshipEndScopes = {
    allocatedTo: { source: ['Requirement', 'Hazard'], target: ['Requirement', 'Hazard', 'OperativeAction', 'SystemFunction'] },
};

describe('linkCategory', () => {
    it('reads a category from what the ontology declares', () => {
        expect(linkCategory(definition('AllocatedTo'))).toBe('allocation');
        expect(linkCategory(definition('SatisfiedBy'))).toBe('trace');
        expect(linkCategory(definition('Mitigates'))).toBe('trace');
        expect(linkCategory(definition('VerifiedBy'))).toBe('trace');
    });
    it('does not take typed ends for a trace', () => {
        expect(linkCategory(definition('HostedBy'))).toBeUndefined();
        expect(linkCategory(definition('Composes'))).toBeUndefined();
        expect(linkCategory(definition('MemoLink'))).toBeUndefined();
        expect(linkCategory(definition('FunctionalTransfer'))).toBeUndefined();
    });
});

describe('what a row can take', () => {
    it('offers allocation on a part and an action, and not on what the rules refuse', () => {
        expect(rowLinkCategories({ kind: 'SoftwareModule' }, registries, scopes).has('allocation')).toBe(true);
        expect(rowLinkCategories({ kind: 'OperativeAction' }, registries, scopes).has('allocation')).toBe(true);
        expect(rowLinkCategories({ kind: 'Requirement' }, registries, scopes).has('allocation')).toBe(false);
        expect(rowLinkCategories({ kind: 'Hazard' }, registries, scopes).has('allocation')).toBe(false);
    });
    it('offers a trace wherever a typed relation fits the row', () => {
        expect(rowLinkCategories({ kind: 'OperativeAction' }, registries, scopes).has('trace')).toBe(true);
        expect(rowLinkCategories({ kind: 'Requirement' }, registries, scopes).has('trace')).toBe(true);
    });
    it('does not offer a trace the writer cannot place, though it is one', () => {
        expect(rowMayHold(definition('VerifiedBy'), 'outgoing', { kind: 'SoftwareModule' }, scopes)).toBe(false);
    });
    it('applies the rules to the end each side holds', () => {
        const allocation = definition('AllocatedTo');
        expect(rowMayHold(allocation, 'outgoing', { kind: 'OperativeAction' }, scopes)).toBe(true);
        expect(rowMayHold(allocation, 'incoming', { kind: 'SoftwareModule' }, scopes)).toBe(false);
        expect(rowMayHold(definition('Mitigates'), 'incoming', { kind: 'Hazard' }, scopes)).toBe(true);
        expect(targetMayHold(allocation, 'outgoing', { kind: 'SoftwareModule' }, scopes)).toBe(true);
        expect(targetMayHold(allocation, 'outgoing', { kind: 'Requirement' }, scopes)).toBe(false);
    });
    it('offers everything the ends allow until the rules have arrived', () => {
        expect(rowLinkCategories({ kind: 'Requirement' }, registries, undefined).has('allocation')).toBe(true);
    });
});

describe('linksByRow', () => {
    const model = {
        elements: {
            fn: el('fn', 'SystemFunction', 'action', { allocatedTo: 'cmp' }),
            cmp: el('cmp', 'LogicalComponent', 'part'),
            req: el('req', 'Requirement', 'requirement'),
            haz: el('haz', 'Hazard', 'item'),
        },
        relationships: [
            link('allocatedTo', 'fn', 'cmp'), link('satisfiedBy', 'req', 'fn'), link('mitigates', 'fn', 'haz'), link('composes', 'cmp', 'fn'),
        ],
    } as unknown as MemoModelDTO;

    it('lists a trace on both rows it joins and an allocation only on what is allocated', () => {
        const links = linksByRow(model, registries);
        expect(links.get('fn')!.allocation.map(item => item.otherId)).toEqual(['cmp']);
        expect(links.get('fn')!.trace.map(item => [item.type, item.otherId, item.direction])).toEqual([
            ['satisfiedBy', 'req', 'incoming'], ['mitigates', 'haz', 'outgoing'],
        ]);
        expect(links.get('cmp')?.allocation ?? []).toEqual([]);
        expect(links.get('req')!.trace.map(item => item.otherId)).toEqual(['fn']);
    });
    it('reads a native allocate the model holds only on the element', () => {
        const only = { ...model, relationships: [] } as MemoModelDTO;
        expect(linksByRow(only, registries).get('fn')!.allocation.map(item => item.otherId)).toEqual(['cmp']);
    });
});

describe('childKindOptions', () => {
    it('offers a block the concrete kinds of its family, its own first', () => {
        const names = childKindOptions(el('a', 'LogicalComponent', 'part'), [], registries, 'hierarchy').map(option => option.name);
        expect(names[0]).toBe('LogicalComponent');
        expect(names).toContain('Subsystem');
        expect(names).not.toContain('MemoPart');
        expect(names).not.toContain('SoftwareModule');
        expect(names).not.toContain('OperativeAction');
    });
    it('offers a flow step the action kinds of its layer, a project kind included, a sibling kind first', () => {
        const names = childKindOptions(
            el('s', 'OperativeScenario', 'action', { layer: 'operational' }),
            [el('s::a', 'OperativeAction', 'action')], registries, 'flow').map(option => option.name);
        expect(names[0]).toBe('OperativeAction');
        expect(names).toContain('ProjectStep');
        expect(names).not.toContain('SystemFunction');
        expect(names).not.toContain('Requirement');
    });
    it('puts the ontology kind a project sibling specializes ahead of that sibling', () => {
        const names = childKindOptions(
            el('s', 'OperativeScenario', 'action', { layer: 'operational' }),
            [el('s::a', 'ProjectStep', 'action')], registries, 'flow').map(option => option.name);
        expect(names.slice(0, 2)).toEqual(['OperativeAction', 'ProjectStep']);
    });
});

describe('declaredNameFor', () => {
    it('makes a lowerCamelCase name, never snake case', () => {
        expect(declaredNameFor('Dose command unit', () => false)).toBe('doseCommandUnit');
        expect(declaredNameFor('Motor_driver', () => false)).toBe('motorDriver');
    });
    it('steps past a name already taken', () => {
        const taken = new Set(['pump', 'pump2']);
        expect(declaredNameFor('Pump', name => taken.has(name))).toBe('pump3');
    });
    it('does not start a name with a digit, and refuses text with nothing to name from', () => {
        expect(declaredNameFor('2nd stage', () => false)).toBe('n2ndStage');
        expect(declaredNameFor('—', () => false)).toBeUndefined();
    });
});

describe('flow table', () => {
    const steps = {
        scenario: el('scenario', 'OperativeScenario', 'action'),
        last: el('scenario::last', 'OperativeAction', 'action', { parentAction: 'scenario' }),
        first: el('scenario::first', 'OperativeAction', 'action', { parentAction: 'scenario' }),
        middle: el('scenario::middle', 'OperativeAction', 'action', { parentAction: 'scenario' }),
        block: el('block', 'LogicalComponent', 'part'),
    };
    const model = {
        elements: Object.fromEntries(Object.values(steps).map(step => [step.id, step])),
        relationships: [link('succession', 'scenario::middle', 'scenario::last'), link('succession', 'scenario::first', 'scenario::middle')],
        registries,
    } as unknown as MemoModelDTO;

    it('nests steps under their owner, in the order they run, and leaves out what is not an action', () => {
        const tree = buildFlowTableTree(model);
        expect(tree.roots).toEqual(['scenario']);
        expect(tree.childrenMap.get('scenario')).toEqual(['scenario::first', 'scenario::middle', 'scenario::last']);
        expect(tree.elements.has('block')).toBe(false);
    });
    it('keeps to what the view shows', () => {
        const tree = buildFlowTableTree(model, element => element.id !== 'scenario');
        expect(tree.roots).toEqual(['scenario::first', 'scenario::middle', 'scenario::last']);
    });
    it('adds under the single root, else under the owner the view left out', () => {
        const whole = buildFlowTableTree(model);
        expect(viewInsertionPoint(whole, model).parent?.id).toBe('scenario');
        const steps = buildFlowTableTree(model, element => element.id !== 'scenario');
        expect(viewInsertionPoint(steps, model).parent?.id).toBe('scenario');
    });
});

describe('placing a step in its flow', () => {
    const ranged = (source: string, target: string): MemoRelationship => ({
        ...link('succession', source, target), sourceRange: { offset: 0, length: 1 },
    });
    // a -> b -> c, and d is new.
    const order = [ranged('a', 'b'), ranged('b', 'c')];

    it('puts a step between two by moving the succession that joined them', () => {
        expect(placementWrites('d', ['a', 'b', 'c', 'd'], order, { kind: 'after', afterId: 'a' })).toEqual({
            move: { relationshipId: order[0].id, sourceId: 'a', targetId: 'd' },
            create: [{ sourceId: 'd', targetId: 'b' }],
        });
    });
    it('appends after the last step', () => {
        expect(placementWrites('d', ['a', 'b', 'c'], order, { kind: 'after', afterId: 'c' })).toEqual({ create: [{ sourceId: 'c', targetId: 'd' }] });
    });
    it('starts the flow with it', () => {
        expect(placementWrites('d', ['b', 'c', 'a'], order, { kind: 'start' })).toEqual({ create: [{ sourceId: 'd', targetId: 'a' }] });
    });
    it('joins on as a branch where the succession cannot be moved', () => {
        const unranged = [link('succession', 'a', 'b')];
        expect(placementWrites('d', ['a', 'b'], unranged, { kind: 'after', afterId: 'a' })).toEqual({ create: [{ sourceId: 'a', targetId: 'd' }] });
    });
    it('writes nothing when the step is left out of the order, or has nothing to be ordered with', () => {
        expect(placementWrites('d', ['a', 'b'], order, { kind: 'none' })).toEqual({ create: [] });
        expect(placementWrites('d', ['d'], [], { kind: 'start' })).toEqual({ create: [] });
    });
    it('grows a flow at its end by default', () => {
        expect(defaultPlacement(['a', 'b'])).toEqual({ kind: 'after', afterId: 'b' });
        expect(defaultPlacement([])).toEqual({ kind: 'none' });
    });
});
