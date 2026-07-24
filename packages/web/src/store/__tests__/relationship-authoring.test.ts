import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
    MemoElement, MemoModelDTO, OntologyRegistriesDTO,
} from '@memoarchitect/tools/browser';
import {
    isRelationshipVisibleInView,
    legalRelationshipTypes,
    legalRelationshipsForElement,
} from '@memoarchitect/tools/browser';

// ─── ws-client stub ─────────────────────────────────────────────────────────
//
// The store is exercised against a fake server so pending/confirmed/failed
// transitions can be driven deterministically.

const requestRelationshipCreate = vi.fn();
const requestRelationshipDelete = vi.fn();
const sendDiagramUpdate = vi.fn();

vi.mock('../ws-client', () => ({
    requestRelationshipCreate: (...args: unknown[]) => requestRelationshipCreate(...args),
    requestRelationshipDelete: (...args: unknown[]) => requestRelationshipDelete(...args),
    sendDiagramUpdate: (...args: unknown[]) => sendDiagramUpdate(...args),
    sendElementUpdate: vi.fn(),
    sendElementCreate: vi.fn(),
    sendDiagramCreate: vi.fn(),
    sendDiagramDelete: vi.fn(),
}));

const { useModelStore, getRegistries, getRelationshipDefinition } = await import('../model-store');

// ─── Fixture model ──────────────────────────────────────────────────────────

const registries: OntologyRegistriesDTO = {
    kinds: [
        { name: 'MemoPart', label: 'Memo Part', layer: 'core', construct: 'part def', isAbstract: true },
        { name: 'ArchitectureElement', label: 'Architecture Element', layer: 'core', construct: 'part def', superType: 'MemoPart', isAbstract: true },
        { name: 'VerifiableElement', label: 'Verifiable Element', layer: 'core', construct: 'part def', superType: 'MemoPart', isAbstract: true },
        { name: 'SoftwareComponent', label: 'Software Component', layer: 'software', construct: 'part def', superType: 'ArchitectureElement' },
        { name: 'SoftwareRequirement', label: 'Software Requirement', layer: 'requirements', construct: 'requirement def', superType: 'VerifiableElement' },
    ],
    relationships: [
        {
            name: 'satisfiedBy', sysmlName: 'SatisfiedBy', label: 'Satisfied By', layer: 'requirements',
            sourceEnd: { name: 'satisfyingElement', type: 'ArchitectureElement' },
            targetEnd: { name: 'requiredElement', type: 'VerifiableElement' },
        },
        {
            name: 'tracesTo', sysmlName: 'TracesTo', label: 'Traces To', layer: 'core',
            sourceEnd: { name: 'tracingElement', type: 'MemoPart' },
            targetEnd: { name: 'tracedElement', type: 'MemoPart' },
        },
    ],
};

function element(id: string, kind: string, name = id): MemoElement {
    return {
        id, name, kind, construct: 'part',
        layer: kind === 'SoftwareRequirement' ? 'requirements' : 'software',
        file: 'model/catalog/architecture.sysml',
        attributes: {},
    };
}

const controller = element('controller', 'SoftwareComponent', 'Infusion Controller');
const requirement = element('sr104', 'SoftwareRequirement', 'SR-104');
const offViewRequirement = element('sr999', 'SoftwareRequirement', 'SR-999');

const baseModel: MemoModelDTO = {
    elements: {
        controller, sr104: requirement, sr999: offViewRequirement,
    },
    relationships: [],
    errors: [],
    registries,
    diagrams: [
        {
            id: 'diag-trace', name: 'Trace View', diagramType: 'bdd', viewpointId: 'vp', auto: false,
            elementIds: ['controller', 'sr104'],
            relationshipTypes: ['satisfiedBy'],
        },
    ],
};

/** Reset the store to a known model between tests. */
function resetStore(): void {
    useModelStore.setState({
        model: JSON.parse(JSON.stringify(baseModel)) as MemoModelDTO,
        pendingRelationships: [],
        selectedRelationshipId: null,
        selectedDiagramId: 'diag-trace',
    });
    requestRelationshipCreate.mockReset();
    requestRelationshipDelete.mockReset();
    sendDiagramUpdate.mockReset();
}

beforeEach(resetStore);

const createInput = {
    type: 'satisfiedBy',
    sourceId: 'controller',
    targetId: 'sr104',
    direction: 'outgoing' as const,
    selectedElementId: 'controller',
};

// ─── Registry selectors ─────────────────────────────────────────────────────

describe('registry selectors', () => {
    it('exposes the registries shipped with the model', () => {
        expect(getRegistries(baseModel).relationships).toHaveLength(2);
    });

    it('returns empty registries before the model arrives', () => {
        expect(getRegistries(null)).toEqual({ relationships: [], kinds: [] });
    });

    it('resolves a definition by camelCase or PascalCase name', () => {
        expect(getRelationshipDefinition(baseModel, 'satisfiedBy')?.label).toBe('Satisfied By');
        expect(getRelationshipDefinition(baseModel, 'SatisfiedBy')?.label).toBe('Satisfied By');
        expect(getRelationshipDefinition(baseModel, 'satisfy')).toBeUndefined();
    });
});

// ─── Pending → confirmed ────────────────────────────────────────────────────

describe('createRelationship', () => {
    it('shows a pending row while the server decides', async () => {
        let release: (value: unknown) => void = () => {};
        requestRelationshipCreate.mockReturnValue(new Promise(resolve => { release = resolve; }));

        const inFlight = useModelStore.getState().createRelationship(createInput);

        const pending = useModelStore.getState().pendingRelationships;
        expect(pending).toHaveLength(1);
        expect(pending[0]).toMatchObject({
            type: 'satisfiedBy',
            label: 'Satisfied By',
            sourceId: 'controller',
            targetId: 'sr104',
            status: 'saving',
        });
        // Nothing has been added to the model — persistence is not assumed.
        expect(useModelStore.getState().model!.relationships).toHaveLength(0);

        release({ requestId: 'r', success: true, relationshipId: 'rel_1', sourceFile: 'model/catalog/architecture.sysml' });
        await inFlight;
    });

    it('clears the pending row once the server acknowledges', async () => {
        requestRelationshipCreate.mockResolvedValue({
            requestId: 'r', success: true,
            relationshipId: 'rel_satisfiedBy_controller_sr104',
            sourceFile: 'model/catalog/architecture.sysml',
        });

        const outcome = await useModelStore.getState().createRelationship(createInput);

        expect(outcome.success).toBe(true);
        expect(outcome.relationshipId).toBe('rel_satisfiedBy_controller_sr104');
        expect(outcome.sourceFile).toBe('model/catalog/architecture.sysml');
        expect(useModelStore.getState().pendingRelationships).toHaveLength(0);
    });

    it('passes the whole request through to the server', async () => {
        requestRelationshipCreate.mockResolvedValue({ requestId: 'r', success: true });
        await useModelStore.getState().createRelationship({ ...createInput, diagramId: 'diag-trace' });
        expect(requestRelationshipCreate).toHaveBeenCalledWith({
            ...createInput,
            diagramId: 'diag-trace',
        });
    });

    it('marks the pending row failed and leaves the model unchanged on rejection', async () => {
        requestRelationshipCreate.mockResolvedValue({
            requestId: 'r', success: false,
            error: 'REL-002 SoftwareRequirement cannot occupy the satisfyingElement end of Satisfied By',
            diagnostics: [{ code: 'REL-002', severity: 'error', message: 'illegal end' }],
        });

        const outcome = await useModelStore.getState().createRelationship(createInput);

        expect(outcome.success).toBe(false);
        expect(outcome.diagnostics?.[0].code).toBe('REL-002');

        const pending = useModelStore.getState().pendingRelationships;
        expect(pending).toHaveLength(1);
        expect(pending[0].status).toBe('failed');
        expect(pending[0].error).toContain('REL-002');

        // The model and the view are exactly as they were.
        expect(useModelStore.getState().model!.relationships).toHaveLength(0);
        expect(useModelStore.getState().model!.diagrams![0].elementIds).toEqual(['controller', 'sr104']);
    });

    it('marks the pending row failed when the transport drops', async () => {
        requestRelationshipCreate.mockRejectedValue(new Error('The development server disconnected.'));

        const outcome = await useModelStore.getState().createRelationship(createInput);

        expect(outcome.success).toBe(false);
        expect(outcome.error).toContain('disconnected');
        expect(useModelStore.getState().pendingRelationships[0].status).toBe('failed');
        expect(useModelStore.getState().model!.relationships).toHaveLength(0);
    });

    it('lets the user dismiss a failed pending row', async () => {
        requestRelationshipCreate.mockResolvedValue({ requestId: 'r', success: false, error: 'nope' });
        await useModelStore.getState().createRelationship(createInput);

        const { pendingId } = useModelStore.getState().pendingRelationships[0];
        useModelStore.getState().dismissPendingRelationship(pendingId);
        expect(useModelStore.getState().pendingRelationships).toHaveLength(0);
    });

    it('tracks two concurrent requests independently', async () => {
        const resolvers: Array<(value: unknown) => void> = [];
        requestRelationshipCreate.mockImplementation(
            () => new Promise(resolve => { resolvers.push(resolve); }));

        const first = useModelStore.getState().createRelationship(createInput);
        const second = useModelStore.getState().createRelationship({ ...createInput, targetId: 'sr999' });
        expect(useModelStore.getState().pendingRelationships).toHaveLength(2);

        resolvers[0]({ requestId: 'a', success: true });
        await first;
        // The second is still in flight and still pending.
        expect(useModelStore.getState().pendingRelationships.map(p => p.targetId)).toEqual(['sr999']);

        resolvers[1]({ requestId: 'b', success: false, error: 'rejected' });
        await second;
        expect(useModelStore.getState().pendingRelationships[0].status).toBe('failed');
    });
});

// ─── Deletion ───────────────────────────────────────────────────────────────

describe('deleteRelationship', () => {
    beforeEach(() => {
        useModelStore.setState({
            model: {
                ...baseModel,
                relationships: [
                    { id: 'rel_a', type: 'satisfiedBy', sourceId: 'controller', targetId: 'sr104', sourceEnd: 's', targetEnd: 't', file: 'model/catalog/architecture.sysml', named: true },
                    { id: 'rel_b', type: 'tracesTo', sourceId: 'controller', targetId: 'sr999', sourceEnd: 's', targetEnd: 't', file: 'model/catalog/architecture.sysml', named: true },
                ],
            },
        });
    });

    it('removes only the deleted relationship, keeping both endpoints', async () => {
        requestRelationshipDelete.mockResolvedValue({
            requestId: 'r', success: true, relationshipId: 'rel_a',
            sourceFile: 'model/catalog/architecture.sysml',
        });

        const outcome = await useModelStore.getState().deleteRelationship('rel_a');

        expect(outcome.success).toBe(true);
        const model = useModelStore.getState().model!;
        expect(model.relationships.map(r => r.id)).toEqual(['rel_b']);
        expect(model.elements.controller).toBeDefined();
        expect(model.elements.sr104).toBeDefined();
    });

    it('leaves the model unchanged when the server refuses', async () => {
        requestRelationshipDelete.mockResolvedValue({
            requestId: 'r', success: false, relationshipId: 'rel_a',
            error: 'REL-010 Relationship "rel_a" was not found in the model',
        });

        const outcome = await useModelStore.getState().deleteRelationship('rel_a');

        expect(outcome.success).toBe(false);
        expect(useModelStore.getState().model!.relationships).toHaveLength(2);
    });

    it('clears the inspector when the deleted relationship was selected', async () => {
        useModelStore.setState({ selectedRelationshipId: 'rel_a' });
        requestRelationshipDelete.mockResolvedValue({ requestId: 'r', success: true, relationshipId: 'rel_a' });
        await useModelStore.getState().deleteRelationship('rel_a');
        expect(useModelStore.getState().selectedRelationshipId).toBeNull();
    });
});

// ─── View selection is only changed on confirmation ─────────────────────────

describe('addElementToDiagram', () => {
    it('is not called as a side effect of creating a relationship', async () => {
        requestRelationshipCreate.mockResolvedValue({ requestId: 'r', success: true, relationshipId: 'rel_1' });

        await useModelStore.getState().createRelationship({ ...createInput, targetId: 'sr999' });

        // sr999 is outside the view; the authored selection is untouched.
        expect(useModelStore.getState().model!.diagrams![0].elementIds).toEqual(['controller', 'sr104']);
        expect(sendDiagramUpdate).not.toHaveBeenCalled();
    });

    it('adds the element to the view only when explicitly invoked', () => {
        useModelStore.getState().addElementToDiagram('diag-trace', 'sr999');

        expect(useModelStore.getState().model!.diagrams![0].elementIds).toEqual(['controller', 'sr104', 'sr999']);
        expect(sendDiagramUpdate).toHaveBeenCalledWith({ id: 'diag-trace', elementIds: ['controller', 'sr104', 'sr999'] });
    });

    it('does not duplicate an element already in the view', () => {
        useModelStore.getState().addElementToDiagram('diag-trace', 'sr104');
        expect(useModelStore.getState().model!.diagrams![0].elementIds).toEqual(['controller', 'sr104']);
        expect(sendDiagramUpdate).not.toHaveBeenCalled();
    });

    it('ignores an unknown diagram', () => {
        useModelStore.getState().addElementToDiagram('diag-missing', 'sr999');
        expect(sendDiagramUpdate).not.toHaveBeenCalled();
    });
});

// ─── Shared legality resolver ───────────────────────────────────────────────

describe('shared legality resolver', () => {
    it('gives the Properties panel and the diagram picker the same answer', () => {
        // The panel asks what the element can do, then narrows to one target.
        const panelOptions = legalRelationshipsForElement(controller, registries)
            .filter(entry => entry.directions.includes('outgoing'))
            .map(entry => entry.definition.name);

        // The picker asks directly about the pair.
        const pickerOptions = legalRelationshipTypes(controller, requirement, registries)
            .filter(option => option.direction === 'outgoing')
            .map(option => option.definition.name);

        // Every type the picker offers is a type the panel would also offer.
        for (const name of pickerOptions) expect(panelOptions).toContain(name);
        expect(pickerOptions.sort()).toEqual(['satisfiedBy', 'tracesTo']);
    });

    it('offers nothing in either surface for an illegal pairing', () => {
        // A requirement cannot be the satisfying element of anything.
        const satisfiedByOnly: OntologyRegistriesDTO = {
            kinds: registries.kinds,
            relationships: [registries.relationships[0]],
        };
        const other = element('sr200', 'SoftwareRequirement');

        expect(legalRelationshipTypes(requirement, other, satisfiedByOnly)).toEqual([]);
        expect(legalRelationshipsForElement(requirement, satisfiedByOnly)
            .filter(entry => entry.directions.includes('outgoing'))).toEqual([]);
    });

    it('resolves legality from the ontology, not a hardcoded table', () => {
        // An ontology with no relationships offers nothing, whatever the kinds.
        const empty: OntologyRegistriesDTO = { kinds: registries.kinds, relationships: [] };
        expect(legalRelationshipsForElement(controller, empty)).toEqual([]);
        expect(legalRelationshipTypes(controller, requirement, empty)).toEqual([]);
    });
});

// ─── View profile visibility ────────────────────────────────────────────────

describe('view profile visibility', () => {
    const satisfies = {
        type: 'satisfiedBy', sourceId: 'controller', targetId: 'sr104',
    };

    it('shows a new relationship in every applicable view', () => {
        const applicable = baseModel.diagrams!.map(d => ({
            diagramId: d.id,
            permittedRelationshipTypes: d.relationshipTypes,
            elementIds: d.elementIds,
        }));
        expect(applicable.every(profile => isRelationshipVisibleInView(satisfies, profile))).toBe(true);
    });

    it('keeps a valid relationship hidden in an incompatible profile', () => {
        expect(isRelationshipVisibleInView(satisfies, {
            diagramId: 'diag-flow',
            permittedRelationshipTypes: ['tracesTo'],
            elementIds: ['controller', 'sr104'],
        })).toBe(false);
    });

    it('hides a relationship whose opposite endpoint the view does not select', () => {
        expect(isRelationshipVisibleInView(
            { type: 'satisfiedBy', sourceId: 'controller', targetId: 'sr999' },
            {
                diagramId: 'diag-trace',
                permittedRelationshipTypes: ['satisfiedBy'],
                elementIds: ['controller', 'sr104'],
            })).toBe(false);
    });
});
