import { describe, it, expect } from 'vitest';
import {
    computeScreenLayout, readBounds, toFrame, isOverlay, captureForScreen,
    captureForSelectionContext,
} from '../geometry-view';
import type { MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';

// ─── Fixture: the ui-screen-regions example, reduced ─────────────────────────
//
// Main screen (full frame) contains a rate panel at x=0.04 y=0.14 w=0.55 h=0.44.
// The rate field sits at y=0.35 h=0.65 **of that panel**, and the drug menu is an
// overlay spilling past the panel's bottom edge.

function el(id: string, kind: string, attributes: Record<string, string>): MemoElement {
    return {
        id, name: id, kind, construct: 'part', layer: 'implementation',
        file: 'x.sysml', attributes,
    } as MemoElement;
}

const model: MemoModelDTO = {
    elements: Object.fromEntries([
        el('cap', 'ScreenCapture', {
            imageUri: 'model/assets/mainScreenLayout/main.png', pixelWidth: '1024', pixelHeight: '600',
        }),
        el('screen', 'UIElement', {
            formKind: 'UIElementFormKind::screen',
            'bounds.x': '0.0', 'bounds.y': '0.0', 'bounds.width': '1.0', 'bounds.height': '1.0',
        }),
        el('panel', 'UIElement', {
            formKind: 'UIElementFormKind::panel',
            disclosureKind: 'UIDisclosureKind::inline',
            boundaryColor: '#2DD4A8',
            'bounds.x': '0.04', 'bounds.y': '0.14', 'bounds.width': '0.55', 'bounds.height': '0.44',
        }),
        el('rate', 'UIElement', {
            formKind: 'UIElementFormKind::field',
            disclosureKind: 'UIDisclosureKind::inline',
            'bounds.x': '0.0', 'bounds.y': '0.35', 'bounds.width': '0.55', 'bounds.height': '0.65',
        }),
        el('menu', 'UIElement', {
            formKind: 'UIElementFormKind::selector',
            disclosureKind: 'UIDisclosureKind::overlay',
            'bounds.x': '0.05', 'bounds.y': '0.30', 'bounds.width': '0.90', 'bounds.height': '1.05',
        }),
        el('settingsRow', 'UIElement', {
            formKind: 'UIElementFormKind::button',
            detectionMethod: 'BoundsDetectionKind::automatic',
            detectionConfidence: '0.91',
            'bounds.x': '0.04', 'bounds.y': '0.66', 'bounds.width': '0.92', 'bounds.height': '0.18',
        }),
        el('settingsScreen', 'UIElement', { formKind: 'UIElementFormKind::screen' }),
        el('capSettings', 'ScreenCapture', { imageUri: 'model/assets/settingsScreenLayout/s.png' }),
        el('nestedRegion', 'UIElement', {
            formKind: 'UIElementFormKind::panel',
            'bounds.x': '0.1', 'bounds.y': '0.2', 'bounds.width': '0.5', 'bounds.height': '0.4',
        }),
        el('nestedState', 'UIElement', {
            formKind: 'UIElementFormKind::selector',
            'bounds.x': '0', 'bounds.y': '0', 'bounds.width': '1', 'bounds.height': '1',
        }),
        el('capNested', 'ScreenCapture', { imageUri: 'model/assets/nested/state.png' }),
    ].map(e => [e.id, e])),
    relationships: [
        { id: 'r1', type: 'CapturesScreen', sourceId: 'cap', targetId: 'screen' },
        { id: 'r2', type: 'Composes', sourceId: 'screen', targetId: 'panel' },
        { id: 'r3', type: 'Composes', sourceId: 'panel', targetId: 'rate' },
        { id: 'r4', type: 'Composes', sourceId: 'panel', targetId: 'menu' },
        { id: 'r5', type: 'Composes', sourceId: 'screen', targetId: 'settingsRow' },
        { id: 'r6', type: 'NavigatesTo', sourceId: 'settingsRow', targetId: 'settingsScreen' },
        { id: 'r7', type: 'CapturesScreen', sourceId: 'capSettings', targetId: 'settingsScreen' },
        { id: 'r8', type: 'Composes', sourceId: 'panel', targetId: 'nestedRegion' },
        { id: 'r9', type: 'Composes', sourceId: 'nestedRegion', targetId: 'nestedState' },
        { id: 'r10', type: 'CapturesScreen', sourceId: 'capNested', targetId: 'nestedRegion' },
    ] as any,
    errors: [],
};

describe('geometry view — bounds are parent-relative', () => {
    it('places a child against its parent box, not the frame', () => {
        const scene = computeScreenLayout(model);
        const rate = scene.nodes.find(n => n.element.id === 'rate')!;
        // Panel occupies x 0.04..0.59, y 0.14..0.58.
        // Rate is 55% wide OF THE PANEL — 0.55 * 0.55 = 0.3025 of the frame,
        // NOT 0.55 of the frame. This is the assertion that catches the
        // frame-relative bug.
        expect(rate.rect.width).toBeCloseTo(0.3025, 6);
        expect(rate.rect.x).toBeCloseTo(0.04, 6);
        expect(rate.rect.y).toBeCloseTo(0.14 + 0.35 * 0.44, 6);
        expect(rate.rect.height).toBeCloseTo(0.65 * 0.44, 6);
    });

    it('accumulates transforms down the tree, recording depth', () => {
        const scene = computeScreenLayout(model);
        const byId = Object.fromEntries(scene.nodes.map(n => [n.element.id, n]));
        expect(byId['screen'].depth).toBe(0);
        expect(byId['panel'].depth).toBe(1);
        expect(byId['rate'].depth).toBe(2);
        expect(byId['panel'].parentId).toBe('screen');
        expect(byId['rate'].parentId).toBe('panel');
    });

    it('lets an overlay escape its parent box without clipping', () => {
        const scene = computeScreenLayout(model);
        const menu = scene.nodes.find(n => n.element.id === 'menu')!;
        const panel = scene.nodes.find(n => n.element.id === 'panel')!;
        expect(isOverlay(menu)).toBe(true);
        // The menu's bottom edge lies past the panel's — correct for a dropdown.
        expect(menu.rect.y + menu.rect.height).toBeGreaterThan(panel.rect.y + panel.rect.height);
    });
});

describe('geometry view — model facts reach the scene', () => {
    it('resolves the backdrop through CapturesScreen', () => {
        const scene = computeScreenLayout(model);
        expect(scene.screen?.id).toBe('screen');
        expect(scene.imageUri).toBe('/model/assets/mainScreenLayout/main.png');
        expect(scene.pixelWidth).toBe(1024);
    });

    it('strips enum qualification so values are comparable', () => {
        const scene = computeScreenLayout(model);
        const panel = scene.nodes.find(n => n.element.id === 'panel')!;
        expect(panel.formKind).toBe('panel');
        expect(panel.disclosureKind).toBe('inline');
        expect(panel.boundaryColor).toBe('#2DD4A8');
    });

    it('flags automatic bounds no reviewer confirmed', () => {
        const scene = computeScreenLayout(model);
        const row = scene.nodes.find(n => n.element.id === 'settingsRow')!;
        expect(row.unconfirmed).toBe(true);
        expect(row.detectionConfidence).toBeCloseTo(0.91, 6);
        // A manually drawn element is never flagged.
        expect(scene.nodes.find(n => n.element.id === 'panel')!.unconfirmed).toBe(false);
    });

    it('carries NavigatesTo so the view can follow it to the next capture', () => {
        const scene = computeScreenLayout(model);
        const row = scene.nodes.find(n => n.element.id === 'settingsRow')!;
        expect(row.navigatesToId).toBe('settingsScreen');
        expect(captureForScreen(model, 'settingsScreen')?.id).toBe('capSettings');
    });

    it('resolves a capture when the DTO dictionary uses usage-name keys', () => {
        const aliased = {
            ...model,
            elements: Object.fromEntries(Object.values(model.elements).map(element => [
                `usage-${element.id}`, element,
            ])),
        };
        expect(captureForScreen(aliased, 'nestedRegion')?.id).toBe('capNested');
    });

    it('defaults disclosure to inline when unset', () => {
        const scene = computeScreenLayout(model);
        expect(scene.nodes.find(n => n.element.id === 'screen')!.disclosureKind).toBe('inline');
    });

    it('encapsulates a captured child region and reveals its children when focused', () => {
        const main = computeScreenLayout(model, { captureId: 'cap' });
        expect(main.nodes.some(n => n.element.id === 'nestedRegion')).toBe(true);
        expect(main.nodes.some(n => n.element.id === 'nestedState')).toBe(false);

        const focused = computeScreenLayout(model, { captureId: 'capNested' });
        expect(focused.screen?.id).toBe('nestedRegion');
        expect(focused.nodes.find(n => n.element.id === 'nestedRegion')?.rect)
            .toEqual({ x: 0, y: 0, width: 1, height: 1 });
        expect(focused.nodes.some(n => n.element.id === 'nestedState')).toBe(true);
    });

    it('opens the nearest parent capture when a nested child is selected', () => {
        expect(captureForSelectionContext(model, 'screen', 'nestedState')?.id).toBe('capNested');
        // Selecting the captured parent itself keeps it visible in its parent frame.
        expect(captureForSelectionContext(model, 'screen', 'nestedRegion')?.id).toBe('cap');
        expect(captureForSelectionContext(model, 'screen', 'panel')?.id).toBe('cap');
    });
});

describe('geometry view — degenerate models explain themselves', () => {
    it('reports an absent capture rather than rendering blank', () => {
        const scene = computeScreenLayout({ elements: {}, relationships: [], errors: [] });
        expect(scene.nodes).toHaveLength(0);
        expect(scene.emptyReason).toMatch(/No ScreenCapture/);
    });

    it('reports a capture that is not linked to a screen', () => {
        const orphan: MemoModelDTO = {
            elements: { cap: el('cap', 'ScreenCapture', { imageUri: 'a.png' }) },
            relationships: [], errors: [],
        };
        expect(computeScreenLayout(orphan).emptyReason).toMatch(/CapturesScreen/);
    });

    it('skips elements with no bounds instead of placing them at the origin', () => {
        const scene = computeScreenLayout(model);
        // settingsScreen has no bounds and is not a Composes child — never placed.
        expect(scene.nodes.some(n => n.element.id === 'settingsScreen')).toBe(false);
    });
});

describe('geometry view — helpers', () => {
    it('readBounds returns undefined when any component is missing', () => {
        expect(readBounds(el('p', 'UIElement', { 'bounds.x': '0', 'bounds.y': '0' }))).toBeUndefined();
    });

    it('toFrame is associative down a two-level chain', () => {
        const parent = { x: 0.1, y: 0.2, width: 0.5, height: 0.4 };
        const child = { x: 0.5, y: 0.5, width: 0.5, height: 0.5 };
        expect(toFrame(parent, child)).toEqual({ x: 0.35, y: 0.4, width: 0.25, height: 0.2 });
    });
});
