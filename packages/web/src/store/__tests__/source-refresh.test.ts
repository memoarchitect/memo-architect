// Source-change tracking: which surfaces a rebuild affects, and how the store
// records it. The rule under test is that a change is claimed only by surfaces
// that actually depend on the changed file — directly or through an import.

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

const {
    useModelStore, getDiagramSourceFiles, getElementSourceFiles, sourceChangeAffects,
    getDiagramsForViewpoint,
} = await import('../model-store');

function element(id: string, file: string): MemoElement {
    return {
        id, name: id, kind: 'SoftwareComponent', construct: 'part',
        layer: 'software', file, attributes: {},
    };
}

const model: MemoModelDTO = {
    elements: {
        pump: element('pump', 'model/catalog/parts.sysml'),
        sensor: element('sensor', 'model/catalog/sensors.sysml'),
    },
    relationships: [],
    errors: [],
    revision: 7,
    sourceGraph: {
        dependsOn: {
            'model/views/overview.sysml': ['model/catalog/parts.sysml', 'model/shared/types.sysml'],
            'model/catalog/parts.sysml': ['model/shared/types.sysml'],
        },
    },
    diagrams: [
        {
            id: 'diag-overview', name: 'Overview', diagramType: 'bdd', viewpointId: 'vp', auto: false,
            sourceFile: 'model/views/overview.sysml',
            elementIds: ['pump'],
            sourceFiles: [
                'model/catalog/parts.sysml',
                'model/shared/types.sysml',
                'model/views/overview.sysml',
            ],
        },
        {
            // An older server that predates sourceFiles still reports its own file.
            id: 'diag-legacy', name: 'Legacy', diagramType: 'bdd', viewpointId: 'vp', auto: false,
            sourceFile: 'model/views/legacy.sysml',
        },
        { id: 'diag-generated', name: 'Generated', diagramType: 'bdd', viewpointId: 'vp', auto: true },
    ],
};

beforeEach(() => {
    useModelStore.setState({ model, lastSourceChange: null });
});

describe('applySourceChange', () => {
    it('records the reported change and increments its own sequence', () => {
        useModelStore.getState().applySourceChange({ files: ['model/a.sysml'], revision: 8, at: 1000 });
        expect(useModelStore.getState().lastSourceChange).toEqual({
            files: ['model/a.sysml'], revision: 8, at: 1000, seq: 1,
        });

        // A repeat change to the same file is a new event, not a no-op.
        useModelStore.getState().applySourceChange({ files: ['model/a.sysml'], revision: 9, at: 2000 });
        expect(useModelStore.getState().lastSourceChange).toMatchObject({ revision: 9, seq: 2 });
    });

    it('replaces rather than accumulates — it is an event, not a log', () => {
        useModelStore.getState().applySourceChange({ files: ['model/a.sysml'], revision: 8, at: 1 });
        useModelStore.getState().applySourceChange({ files: ['model/b.sysml'], revision: 9, at: 2 });
        expect(useModelStore.getState().lastSourceChange!.files).toEqual(['model/b.sysml']);
    });
});

describe('getDiagramSourceFiles', () => {
    it('uses the closure the server computed', () => {
        expect(getDiagramSourceFiles(model, 'diag-overview')).toEqual([
            'model/catalog/parts.sysml',
            'model/shared/types.sysml',
            'model/views/overview.sysml',
        ]);
    });

    it('falls back to the diagram\'s own file when the server sent no closure', () => {
        expect(getDiagramSourceFiles(model, 'diag-legacy')).toEqual(['model/views/legacy.sysml']);
    });

    it('reports nothing for a generated view with no source file', () => {
        expect(getDiagramSourceFiles(model, 'diag-generated')).toEqual([]);
    });

    it('reports nothing for an unknown diagram', () => {
        expect(getDiagramSourceFiles(model, 'diag-missing')).toEqual([]);
    });
});

describe('getDiagramsForViewpoint', () => {
    it('returns one reusable view from each of its linked viewpoints', () => {
        const reusable = {
            id: 'diag-reusable', name: 'Reusable', diagramType: 'bdd',
            viewpointId: 'vp-software', viewpointIds: ['vp-software', 'vp-safety'], auto: true,
        };
        const reusableModel = { ...model, diagrams: [reusable] } as MemoModelDTO;

        expect(getDiagramsForViewpoint(reusableModel, 'vp-software').map(d => d.id)).toEqual(['diag-reusable']);
        expect(getDiagramsForViewpoint(reusableModel, 'vp-safety').map(d => d.id)).toEqual(['diag-reusable']);
    });
});

describe('getElementSourceFiles', () => {
    it('covers the element\'s own file and everything it imports', () => {
        expect(getElementSourceFiles(model, 'pump').sort())
            .toEqual(['model/catalog/parts.sysml', 'model/shared/types.sysml']);
    });

    it('covers just the file when it imports nothing', () => {
        expect(getElementSourceFiles(model, 'sensor')).toEqual(['model/catalog/sensors.sysml']);
    });

    it('reports nothing for an unknown element', () => {
        expect(getElementSourceFiles(model, 'missing')).toEqual([]);
    });
});

describe('sourceChangeAffects', () => {
    const change = (files: string[]) => ({ files, revision: 8, at: 1, seq: 1 });

    it('claims a change to the view\'s own source', () => {
        expect(sourceChangeAffects(
            change(['model/views/overview.sysml']),
            getDiagramSourceFiles(model, 'diag-overview'))).toBe(true);
    });

    it('claims a change to a file the view only reaches through an import', () => {
        expect(sourceChangeAffects(
            change(['model/shared/types.sysml']),
            getDiagramSourceFiles(model, 'diag-overview'))).toBe(true);
    });

    it('claims a change to the file of an element the view displays', () => {
        expect(sourceChangeAffects(
            change(['model/catalog/parts.sysml']),
            getDiagramSourceFiles(model, 'diag-overview'))).toBe(true);
    });

    it('ignores a change to an unrelated file', () => {
        expect(sourceChangeAffects(
            change(['model/catalog/sensors.sysml']),
            getDiagramSourceFiles(model, 'diag-overview'))).toBe(false);
    });

    it('claims nothing before any change has arrived', () => {
        expect(sourceChangeAffects(null, getDiagramSourceFiles(model, 'diag-overview'))).toBe(false);
    });

    it('claims nothing when the surface cannot state its dependencies', () => {
        // A generated view knows no files, so it must not claim every rebuild.
        expect(sourceChangeAffects(change(['model/views/overview.sysml']), [])).toBe(false);
    });
});
