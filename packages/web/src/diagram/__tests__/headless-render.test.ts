// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { useModelStore } from '../../store/model-store';
import { renderDiagramForDriver } from '../headless-render';

// A view is authored, so one with no stored layout is reported to the driver and never laid out.

describe('drawing a view for a driver', () => {
    beforeEach(() => {
        useModelStore.setState({
            model: { diagrams: [{ id: 'view-heater', name: 'heaterAssemblyIBD', diagramType: 'ibd' }] } as never,
            diagramLayouts: {},
        });
    });

    it('names a reference no view answers to', async () => {
        expect(await renderDiagramForDriver('nothing-like-it-at-all', {})).toEqual({ ok: false, reason: 'no view answers to "nothing-like-it-at-all"' });
    });

    it('refuses a view that has no stored layout, instead of laying it out', async () => {
        const result = await renderDiagramForDriver('heaterAssemblyIBD', {});
        expect(result).toMatchObject({ ok: false });
        expect((result as { reason: string }).reason).toContain('has no stored layout');
        expect(useModelStore.getState().activeView).not.toMatchObject({ type: 'diagram' });
    });

    it('refuses a layout that positions nothing', async () => {
        const result = await renderDiagramForDriver('heaterAssemblyIBD', { 'view-heater': { nodes: {}, edges: {} } });
        expect(result).toMatchObject({ ok: false });
    });
});
