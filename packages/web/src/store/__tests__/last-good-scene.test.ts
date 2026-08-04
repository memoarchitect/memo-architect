// §1.1 — "the last good picture stays on screen".
//
// Typing invalid text into a diagram's source file and saving is an ordinary
// working state. The compiler reports it; nothing refuses the save, nothing
// blanks the canvas, and nothing demands a relaunch. This pins the client half:
// the model the canvas draws from survives an incoherent rebuild, the UI is
// told it is looking at the last good one, and a clean rebuild restores normal
// operation without a restart.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';

vi.mock('../ws-client', () => ({
    requestRelationshipCreate: vi.fn(),
    requestRelationshipDelete: vi.fn(),
    sendDiagramUpdate: vi.fn(),
    sendElementUpdate: vi.fn(),
    sendElementCreate: vi.fn(),
    sendDiagramCreate: vi.fn(),
    sendDiagramDelete: vi.fn(),
}));

const { useModelStore } = await import('../model-store');

function element(id: string, file: string): MemoElement {
    return {
        id, name: id, kind: 'SoftwareComponent', construct: 'part',
        layer: 'software', file, attributes: {},
    };
}

const lastGoodModel: MemoModelDTO = {
    elements: { pump: element('pump', 'model/parts.sysml') },
    relationships: [],
    errors: [],
    revision: 7,
    diagrams: [{
        id: 'diag-overview', name: 'Overview', diagramType: 'bdd', viewpointId: 'vp',
        auto: false, sourceFile: 'model/parts.sysml', elementIds: ['pump'],
    }],
};

const brokenSource = {
    coherent: false,
    files: ['model/parts.sysml'],
    diagnostics: [{
        file: 'model/parts.sysml', message: "expecting ';' but found '}'", line: 12, column: 3,
    }],
    lastGoodRevision: 7,
};

beforeEach(() => {
    useModelStore.setState({
        model: lastGoodModel,
        sourceCoherence: null,
        restartRequired: null,
        activeView: { type: 'diagram', diagramId: 'diag-overview' },
        selectedDiagramId: 'diag-overview',
    });
});

describe('an incoherent rebuild', () => {
    it('leaves the last good model in place for the canvas to draw', () => {
        useModelStore.getState().setSourceCoherence(brokenSource);

        const state = useModelStore.getState();
        expect(state.model).toBe(lastGoodModel);
        expect(state.model?.elements.pump).toBeDefined();
        expect(state.selectedDiagramId).toBe('diag-overview');
    });

    it('records what is broken so the scene can be labelled, not silently stale', () => {
        useModelStore.getState().setSourceCoherence(brokenSource);

        const coherence = useModelStore.getState().sourceCoherence;
        expect(coherence?.files).toEqual(['model/parts.sysml']);
        expect(coherence?.lastGoodRevision).toBe(7);
        expect(coherence?.diagnostics[0]).toMatchObject({ line: 12, column: 3 });
    });

    it('never asks for a restart — a source typo is not a stale runtime', () => {
        useModelStore.getState().setSourceCoherence(brokenSource);

        expect(useModelStore.getState().restartRequired).toBeNull();
    });
});

describe('recovery', () => {
    it('clears on the next rebuild that parses, with no restart in between', () => {
        const store = useModelStore.getState();
        store.setSourceCoherence(brokenSource);
        expect(useModelStore.getState().sourceCoherence).not.toBeNull();

        store.setSourceCoherence({
            coherent: true, files: [], diagnostics: [], lastGoodRevision: 8,
        });

        expect(useModelStore.getState().sourceCoherence).toBeNull();
        expect(useModelStore.getState().restartRequired).toBeNull();
    });

    it('accepts the repaired model once it compiles again', () => {
        const store = useModelStore.getState();
        store.setSourceCoherence(brokenSource);

        const repaired: MemoModelDTO = {
            ...lastGoodModel,
            revision: 8,
            elements: { ...lastGoodModel.elements, valve: element('valve', 'model/parts.sysml') },
        };
        store.setModel(repaired);
        store.setSourceCoherence({ coherent: true, files: [], diagnostics: [], lastGoodRevision: 8 });

        const state = useModelStore.getState();
        expect(state.model?.revision).toBe(8);
        expect(state.model?.elements.valve).toBeDefined();
        expect(state.sourceCoherence).toBeNull();
    });
});
