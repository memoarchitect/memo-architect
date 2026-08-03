import { describe, expect, it } from 'vitest';
import { notationSceneToSvg, projectLayoutToNotationScene } from '../notation-scene';
import { GRAPHICAL_BNF_SOURCE, resolveNotationGlyph } from '../notation-registry';
import { projectIrSemantics } from '../ir-scene-projection';

describe('NotationScene', () => {
    it('uses the graphical-BNF notation registry for semantic metaclasses', () => {
        expect(GRAPHICAL_BNF_SOURCE).toBe('SysML-graphical-bnf.kgbnf');
        expect(resolveNotationGlyph({ metaclass: 'AcceptActionUsage', isDefinition: false })).toBe('accept');
        expect(resolveNotationGlyph({ metaclass: 'ActivityFinalNodeUsage', isDefinition: false })).toBe('activity-final');
    });

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

    it('takes canonical identity and source location from the IR before rendering', () => {
        const scene = projectLayoutToNotationScene([{ id: 'legacy-pump', position: { x: 0, y: 0 }, data: { label: 'Pump', subjectId: 'pump' } }], []);
        const projected = projectIrSemantics(scene, [{
            kind: 'mapped', memoElementId: 'pump', identity: { id: 'file:///model.sysml#members[0]:PartUsage', metaclass: 'PartUsage' },
            source: { start: { line: 12, column: 5 } },
        }]);
        expect(projected.nodes[0]).toMatchObject({ subjectId: 'file:///model.sysml#members[0]:PartUsage', kind: 'PartUsage', sourceRange: { start: 12, end: 12 } });
    });
});
