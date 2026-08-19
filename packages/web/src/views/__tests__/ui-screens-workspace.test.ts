import { describe, expect, it } from 'vitest';
import type { MemoElement } from '@memoarchitect/tools/browser';
import { nextUiAssetId, nextUiElementId, screenForLayout, usageIdentifier } from '../UiScreensWorkspace';

const element = (id: string, shortId?: string): MemoElement => ({
    id,
    shortId,
    name: id,
    kind: 'UIElement',
    construct: 'part',
    layer: 'implementation',
    file: 'model/ui.sysml',
    attributes: {},
});

describe('UI Screens stable ID allocation', () => {
    it('continues the UIE sequence across internal IDs and displayed short IDs', () => {
        expect(nextUiElementId([
            element('mainScreen', 'UIE-004'),
            element('UIE-007'),
            { ...element('dialog'), attributes: { id: 'UIE-011' } },
            element('unrelated', 'REQ-100'),
        ])).toBe('UIE-012');
    });

    it('continues the UIAsset sequence across internal IDs and short IDs', () => {
        expect(nextUiAssetId([
            { ...element('captureA', 'UIA-002'), kind: 'ScreenCapture' },
            { ...element('UIA-005'), kind: 'ScreenCapture' },
            { ...element('captureC'), kind: 'ScreenCapture', attributes: { id: 'UIA-008' } },
        ])).toBe('UIA-009');
    });

    it('keeps the stable ID in model data and generates a valid SysML usage identifier', () => {
        expect(usageIdentifier('UIE-012', 'uiElement', [])).toBe('uiElement12');
        expect(usageIdentifier('UIE-012', 'uiElement', [element('uiElement12')])).toBe('uiElement12_2');
        expect(usageIdentifier('UIA-009', 'uiAsset', [])).toBe('uiAsset9');
    });
});

describe('finding the screen a layout view draws', () => {
    // The view and the screen share an authored id; the element's own `id` is
    // its usage name, so only the authored id links the two.
    const screen = { ...element('elMainScreen'), attributes: { providedId: 'UIE-001', formKind: 'UIElementFormKind::screen' } };

    it('matches the layout view to the screen by their shared authored id', () => {
        expect(screenForLayout({ id: 'UIE-001', name: 'mainScreenLayout' }, [screen])).toBe(screen);
    });

    it('still matches a project that names the usage after the id', () => {
        const named = element('UIE-002');
        expect(screenForLayout({ id: 'UIE-002', name: 'other' }, [named])).toBe(named);
    });

    it('finds nothing rather than guessing when no screen corresponds', () => {
        expect(screenForLayout({ id: 'UIE-999', name: 'zzz' }, [screen])).toBeUndefined();
    });
});
