import { describe, it, expect } from 'vitest';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { viewpointDashboardId, viewpointDashboardMarkdown } from '../viewpoint-dashboard';
import { builtinDashboards, resolveDashboard } from '../dashboards';

const el = (id: string, over: Record<string, unknown> = {}) => ({
    id, name: id, kind: 'X', construct: 'part', layer: 'x', file: 'f.sysml', attributes: {}, ...over,
});

function model(over: Partial<MemoModelDTO> = {}): MemoModelDTO {
    return {
        elements: {
            ibdViewpoint: el('ibdViewpoint', {
                construct: 'viewpoint',
                attributes: { providedId: 'VP-IBD', shortDescription: 'Internal structure — parts and ports.' },
            }),
        },
        relationships: [],
        errors: [],
        viewpoints: [
            { id: 'VP-IBD', label: 'Internal Block Diagram', visibleKinds: [], visibleRelationships: [], visibleLayers: [] },
            { id: 'VP-CHILD', label: 'Pump IBDs', parentId: 'VP-IBD', visibleKinds: [], visibleRelationships: [], visibleLayers: [] },
            { id: '__unassigned', label: 'Unassigned', visibleKinds: [], visibleRelationships: [], visibleLayers: [] },
        ],
        diagrams: [
            { id: 'heater', name: 'heaterAssemblyIBD', diagramType: 'IBD', viewpointId: 'VP-IBD', auto: false, description: 'The heater.' },
            { id: 'machine', name: 'beverageMachineIBD', diagramType: 'IBD', viewpointId: 'VP-OTHER', viewpointIds: ['VP-IBD'], auto: false },
            { id: 'unrelated', name: 'ctx', diagramType: 'CTX', viewpointId: 'VP-CTX', auto: false },
        ],
        ...over,
    } as unknown as MemoModelDTO;
}

describe('viewpointDashboardMarkdown', () => {
    it('writes the description, every governed view live, and commentary placeholders', () => {
        const md = viewpointDashboardMarkdown(model(), model().viewpoints![0]);
        expect(md).toContain('viewpoint: VP-IBD');
        expect(md).toContain('# Internal Block Diagram');
        expect(md).toContain('Internal structure — parts and ports.');
        expect(md).toContain('{{diagram:heater}}');
        expect(md).toContain('{{diagram:machine}}');
        expect(md).not.toContain('{{diagram:unrelated}}');
        expect(md).toContain('The heater.');
        expect(md.match(/\*\*Commentary\*\*/g)).toHaveLength(2);
        expect(md).toContain('## Open questions');
        expect(md).toContain('## Decisions and rationale');
        expect(md).toContain(`[Pump IBDs](/dashboards/${viewpointDashboardId('VP-CHILD')})`);
    });

    it('uses a placeholder row, and says how to declare, when the model has no stakeholders or concerns', () => {
        const md = viewpointDashboardMarkdown(model(), model().viewpoints![0]);
        expect(md).toContain('| _Who is this for?_ |');
        expect(md).toContain('`framedConcerns`');
    });

    it('lists declared stakeholders and framed concerns instead of placeholders', () => {
        const m = model();
        m.elements.ibdViewpoint.attributes.stakeholders = '(clinician, biomedEngineer)';
        m.elements.clinician = el('clinician', { name: 'Clinician' }) as any;
        m.elements.safety = el('safety', { name: 'Safety', attributes: { description: 'Freedom from harm.' } }) as any;
        m.relationships.push({ sourceId: 'ibdViewpoint', targetId: 'safety', type: 'FramesConcern' } as any);
        const md = viewpointDashboardMarkdown(m, m.viewpoints![0]);
        expect(md).not.toContain('_Who is this for?_');
        expect(md).toContain('| Clinician | **Safety** — Freedom from harm. |');
        expect(md).toContain('| biomedEngineer |  |');
    });

    it('says so when no view conforms yet', () => {
        const md = viewpointDashboardMarkdown(model({ diagrams: [] }), model().viewpoints![0]);
        expect(md).toContain('No views conform to this viewpoint yet');
    });
});

describe('built-in dashboards', () => {
    it('generates one per authored viewpoint, beside home, skipping synthetic ones', () => {
        expect(builtinDashboards(model()).map(b => b.id)).toEqual(['home', 'viewpoint-vp-ibd', 'viewpoint-vp-child']);
        expect(builtinDashboards(null).map(b => b.id)).toEqual(['home']);
    });

    it('resolves a viewpoint page as built-in until a file overrides it', () => {
        const builtins = builtinDashboards(model());
        expect(resolveDashboard([], 'viewpoint-vp-ibd', undefined, builtins)).toMatchObject({ scope: 'builtin', builtin: true, title: 'Internal Block Diagram' });
        const file = { id: 'viewpoint-vp-ibd', scope: 'shared' as const, title: 'IBD', content: '# ours', path: 'dashboards/viewpoint-vp-ibd.md', updatedAt: 0 };
        expect(resolveDashboard([file], 'viewpoint-vp-ibd', undefined, builtins)).toMatchObject({ scope: 'shared', builtin: true, content: '# ours' });
    });
});
