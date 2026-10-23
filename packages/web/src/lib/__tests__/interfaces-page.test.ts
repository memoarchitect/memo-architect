import { describe, it, expect } from 'vitest';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import { interfacesMarkdown, savedInterfaces, selectableParts } from '../interfaces-page';
import { renderDashboardHtml } from '../../dhf/document-renderer';
import type { DhfSettings } from '../../store/model-store';

const el = (id: string, construct: string, extra: Record<string, unknown> = {}) =>
    ({ id, name: id.split('::').pop(), construct, kind: 'Part', attributes: {}, ...extra });

const model = {
    elements: {
        'p::lidar': el('p::lidar', 'part'),
        'p::lidar::scanOut': el('p::lidar::scanOut', 'port', { owner: 'p::lidar' }),
        'p::nav': el('p::nav', 'part'),
        'p::nav::scanIn': el('p::nav::scanIn', 'port', { owner: 'p::nav' }),
        'p::Node': el('p::Node', 'part', { isDefinition: true }),
    },
    relationships: [{
        id: 'p::scanToNav', shortName: 'scanToNav', type: 'interface', kind: 'RosTopicInterface',
        sourceId: 'p::lidar', targetId: 'p::nav', sourceEnd: '', targetEnd: '', file: 'x',
        sourcePortId: 'p::lidar::scanOut', targetPortId: 'p::nav::scanIn',
    }],
    errors: [],
} as unknown as MemoModelDTO;

describe('interfaces page', () => {
    it('offers parts, not definitions or ports', () => {
        expect(selectableParts(model).map(p => p.id)).toEqual(['p::lidar', 'p::nav']);
    });

    it('writes a page whose body names the two parts by id', () => {
        const md = interfacesMarkdown(model, 'p::lidar', 'p::nav', 'Lidar and nav');
        expect(md).toContain('title: Lidar and nav');
        expect(md).toContain('{{interfaces:p::lidar | p::nav}}');
    });

    it('renders the saved page as a table pulled from the model', () => {
        const md = interfacesMarkdown(model, 'p::lidar', 'p::nav', 'Lidar and nav');
        const html = renderDashboardHtml(md, model, {} as DhfSettings);
        expect(html).toContain('scanToNav');
        expect(html).toContain('RosTopicInterface');
        expect(html).toContain('scanOut');
        expect(html).toContain('Port on lidar');
        expect(html).toContain('Port on nav');
        expect(html).not.toContain('→');
    });

    it('finds a saved page by its directive, and ignores other dashboards', () => {
        const md = interfacesMarkdown(model, 'p::lidar', 'p::nav', 'Lidar and nav');
        const dash = (id: string, content: string) => ({ id, scope: 'user', title: id, content, path: `dashboards/user/${id}.md`, updatedAt: 0 } as const);
        const found = savedInterfaces([dash('one', md), dash('two', '# Notes\n\nNothing here.')]);
        expect(found.map(f => [f.dashboard.id, f.a, f.b])).toEqual([['one', 'p::lidar', 'p::nav']]);
    });

    it('says so when there is none, and when a part is gone', () => {
        const none = renderDashboardHtml('{{interfaces:p::nav | p::nav::scanIn}}', model, {} as DhfSettings);
        expect(none).toContain('No interfaces between');
        const gone = renderDashboardHtml('{{interfaces:p::nav | p::missing}}', model, {} as DhfSettings);
        expect(gone).toContain('p::missing not found');
    });
});
