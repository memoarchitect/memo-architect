import { describe, expect, it } from 'vitest';
import { notationSceneToSvg, projectLayoutToNotationScene } from '../notation-scene';

describe('NotationScene', () => {
    it('carries action-flow notation and exact pin attachment independently of a renderer', () => {
        const scene = projectLayoutToNotationScene([
            { id: 'receive', position: { x: 0, y: 0 }, data: { label: 'receiveOrder', kind: 'AcceptActionUsage', nodeType: 'accept', outPorts: ['order'] } },
            { id: 'decision', position: { x: 180, y: 0 }, data: { label: 'routeOrder', kind: 'DecisionNodeUsage', nodeType: 'decision' } },
            { id: 'finish', position: { x: 360, y: 0 }, data: { label: 'Done', kind: 'ActivityFinalNodeUsage', nodeType: 'activityFinal' } },
        ], [{ id: 'order-flow', source: 'receive', target: 'decision', sourceHandle: 'out:order', label: 'Order', data: { subjectId: 'flow:Order' } }]);
        expect(scene.nodes.map(n => n.glyph)).toEqual(['accept', 'decision', 'activity-final']);
        expect(scene.nodes[0].ports?.[0]).toMatchObject({ id: 'out:order', pin: true });
        expect(scene.edges[0]).toMatchObject({ subjectId: 'flow:Order', sourcePortId: 'out:order', label: 'Order' });
        expect(notationSceneToSvg(scene)).toContain('data-subject-id="flow:Order"');
    });

    it('uses a deterministic generic glyph and amber diagnostic badge', () => {
        const scene = projectLayoutToNotationScene([{ id: 'unknown', position: { x: 0, y: 0 }, data: { label: 'Unmapped', genericRecord: true, diagnostic: { domain: 'memo-ingest', severity: 'warning', message: 'not lowered' } } }], []);
        expect(scene.nodes[0]).toMatchObject({ glyph: 'generic', diagnostic: { domain: 'memo-ingest' } });
        expect(notationSceneToSvg(scene)).toContain('#d97706');
    });
});
