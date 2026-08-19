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
            { id: 'interact', type: 'connect', sourceId: 'clinician', targetId: 'pump' },
            { id: 'exchange', type: 'flow', sourceId: 'pump', targetId: 'pharmacy' },
            { id: 'context', type: 'appliesInContext', sourceId: 'home', targetId: 'pump' },
        ]), 'Infusion Pump Context');

        const boundary = layout.nodes.find(node => node.id === '__context_boundary__')!;
        const systemNode = layout.nodes.find(node => node.id === 'pump')!;
        expect(boundary).toMatchObject({ type: 'contextBoundary', data: { isFrame: true } });
        expect(systemNode).toMatchObject({ type: 'contextSystem', parentId: '__context_boundary__', extent: 'parent' });
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
            { id: 'care', type: 'connect', sourceId: 'patient', targetId: 'pump' },
        ]));
        expect(layout.nodes.map(node => node.id)).not.toContain('motor');
        expect(layout.nodes.map(node => node.id)).toEqual(expect.arrayContaining(['pump', 'patient']));
    });

    it('places InteractsInContext participants on their authored sides and uses its verb label', () => {
        const system = element('pump', 'OperationalEntity', 'Irrigation Pump', { contextRole: 'systemOfInterest' });
        const surgeon = element('surgeon', 'User', 'Surgeon');
        const mains = element('mains', 'OperationalEntity', 'Mains Power');
        const hospital = element('hospital', 'UseEnvironment', 'Hospital Facility');
        const use = element('use', 'UseContext', 'Clinical use constraints');
        const layout = computeContextViewLayout(model({ system, surgeon, mains, hospital, use }, [
            { id: 'actor', type: 'interactsInContext', sourceId: 'surgeon', targetId: 'pump', attributes: { contextSide: "ContextSideKind::'actor'", interactionLabel: 'Directs procedure' } },
            { id: 'external', type: 'interactsInContext', sourceId: 'mains', targetId: 'pump', attributes: { contextSide: 'ContextSideKind::externalSystem', interactionLabel: 'Electrical power' } },
            { id: 'environment', type: 'interactsInContext', sourceId: 'hospital', targetId: 'pump', attributes: { contextSide: 'ContextSideKind::environment', interactionLabel: 'Environmental conditions' } },
            { id: 'constraint', type: 'interactsInContext', sourceId: 'use', targetId: 'pump', attributes: { contextSide: "ContextSideKind::'constraint'", interactionLabel: 'Intended use' } },
        ]));
        const node = (id: string) => layout.nodes.find(candidate => candidate.id === id)!;
        const pump = node('pump');
        expect(node('surgeon').position.x).toBeLessThan(pump.position.x);
        expect(node('mains').position.x).toBeGreaterThan(pump.position.x);
        expect(node('hospital').position.y).toBeLessThan(pump.position.y);
        expect(node('use').position.y).toBeGreaterThan(pump.position.y);
        expect(layout.edges.find(edge => edge.id === 'actor')?.label).toBe('Directs procedure');
    });

    it('honors the view selection instead of laying out unrelated context relationships', () => {
        const pump = element('pump', 'OperationalEntity', 'Irrigation Pump', { contextRole: 'systemOfInterest' });
        const clinician = element('clinician', 'User', 'Clinician');
        const network = element('network', 'OperationalEntity', 'Hospital Network');
        const layout = computeContextViewLayout(model({ pump, clinician, network }, [
            { id: 'shown', type: 'interactsInContext', sourceId: 'clinician', targetId: 'pump' },
            { id: 'hidden', type: 'connect', sourceId: 'network', targetId: 'pump' },
        ]), 'Pump Context', {
            viewpointFilter: element => element.id !== 'network',
            relationshipTypes: ['InteractsInContext'],
        });
        expect(layout.nodes.map(node => node.id)).toEqual(expect.arrayContaining(['pump', 'clinician']));
        expect(layout.nodes.map(node => node.id)).not.toContain('network');
        expect(layout.edges.map(edge => edge.id)).toEqual(['shown']);
    });
});
