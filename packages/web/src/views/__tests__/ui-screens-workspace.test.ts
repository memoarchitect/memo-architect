import { describe, expect, it } from 'vitest';
import type { MemoElement } from '@memoarchitect/tools/browser';
import { nextUiAssetId, nextUiElementId, usageIdentifier } from '../UiScreensWorkspace';

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
