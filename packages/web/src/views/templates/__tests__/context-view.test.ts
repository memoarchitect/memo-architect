import { describe, expect, it } from 'vitest';
import { computeContextViewLayout } from '../context-view';

const element = (id: string, kind: string, name = id, attributes: Record<string, string> = {}) =>
    ({ id, kind, name, construct: 'part', layer: 'operational', file: 'test.sysml', attributes });
const model = (elements: Record<string, any>, relationships: any[]) => ({ elements, relationships, errors: [] }) as any;

describe('system context view template', () => {
    it('draws one black-box system inside a system boundary and participants outside it', () => {
        const system = element('pump', 'OperationalEntity', 'Infusion Pump', { contextRole: 'systemOfInterest' });
        const clinician = element('clinician', 'User', 'Clinician');
        const pharmacy = element('pharmacy', 'OperationalEntity', 'Pharmacy Information System');
        const environment = element('home', 'UseContext', 'Home Care Environment');
        const layout = computeContextViewLayout(model({ system, clinician, pharmacy, environment }, [
            { id: 'interact', type: 'interactsWith', sourceId: 'clinician', targetId: 'pump' },
            { id: 'exchange', type: 'exchangesWith', sourceId: 'pump', targetId: 'pharmacy' },
            { id: 'context', type: 'appliesInContext', sourceId: 'home', targetId: 'pump' },
        ]), 'Infusion Pump Context');

        const boundary = layout.nodes.find(node => node.id === '__context_boundary__')!;
        const systemNode = layout.nodes.find(node => node.id === 'pump')!;
        expect(boundary).toMatchObject({ type: 'contextBoundary', data: { isFrame: true } });
        expect(systemNode.type).toBe('contextSystem');
        expect(layout.nodes.filter(node => node.type === 'contextExternal')).toHaveLength(3);
        expect(layout.nodes.find(node => node.id === 'clinician')?.data).toMatchObject({ category: 'person' });
        expect(layout.nodes.find(node => node.id === 'home')?.data).toMatchObject({ category: 'environment' });
        expect(layout.edges).toHaveLength(3);
        expect(layout.edges.every(edge => edge.type === 'useCaseEdge' && Boolean(edge.data?.sourceOffset))).toBe(true);
    });

    it('keeps unrelated internal details out of the context presentation', () => {
        const system = element('pump', 'OperationalEntity', 'Infusion Pump', { contextRole: 'systemOfInterest' });
        const patient = element('patient', 'User', 'Patient');
        const internal = element('motor', 'LogicalComponent', 'Motor Controller');
        const layout = computeContextViewLayout(model({ system, patient, internal }, [
            { id: 'care', type: 'interactsWith', sourceId: 'patient', targetId: 'pump' },
        ]));
        expect(layout.nodes.map(node => node.id)).not.toContain('motor');
        expect(layout.nodes.map(node => node.id)).toEqual(expect.arrayContaining(['pump', 'patient']));
    });
});
