import { describe, expect, it } from 'vitest';
import { computeUseCaseViewLayout, isUseCase, isUseCaseActor, useCaseViewOptions } from '../use-case-view';

const el = (id: string, kind: string, name = id) => ({ id, kind, name, construct: kind === 'UseCase' ? 'use case' : 'part', layer: 'operational', file: 'test.sysml', attributes: {} });
const model = (elements: Record<string, any>, relationships: any[] = []) => ({ elements, relationships, errors: [] }) as any;

describe('use-case view template', () => {
    it('recognizes actors and native use cases', () => {
        expect(isUseCaseActor(el('nurse', 'User'))).toBe(true);
        expect(isUseCaseActor(el('device', 'LogicalComponent'))).toBe(false);
        expect(isUseCase(el('deliver', 'UseCase'))).toBe(true);
    });

    it('places actors outside a system boundary and use cases inside it', () => {
        const nurse = el('nurse', 'User', 'Nurse');
        const patient = el('patient', 'User', 'Patient');
        const deliver = el('deliver', 'UseCase', 'Deliver Therapy');
        const layout = computeUseCaseViewLayout(model({ nurse, patient, deliver }, [
            { id: 'initiate', type: 'Initiates', sourceId: 'nurse', targetId: 'deliver' },
            { id: 'participates', type: 'ParticipatesIn', sourceId: 'patient', targetId: 'deliver' },
        ]), { systemName: 'Infusion Pump' });
        expect(layout.nodes.find(node => node.id === '__use_case_boundary__')?.data).toMatchObject({ label: 'Infusion Pump', isFrame: true });
        expect(layout.nodes.find(node => node.id === 'deliver')?.type).toBe('useCase');
        expect(layout.nodes.filter(node => node.type === 'useCaseActor')).toHaveLength(2);
        expect(layout.edges).toHaveLength(2);
    });

    it('only shows actors connected to visible use cases and preserves extend links', () => {
        const nurse = el('nurse', 'User');
        const unrelated = el('unrelated', 'User');
        const root = el('root', 'UseCase');
        const child = el('child', 'UseCase');
        const extension = el('extension', 'UseCase');
        const layout = computeUseCaseViewLayout(model({ nurse, unrelated, root, child, extension }, [
            { id: 'a', type: 'Initiates', sourceId: 'nurse', targetId: 'root' },
            { id: 'i', type: 'Includes', sourceId: 'root', targetId: 'child' },
            { id: 'e', type: 'Extends', sourceId: 'extension', targetId: 'child' },
        ]), { level: 0, edgeStyle: 'curved' });
        expect(layout.nodes.map(node => node.id)).not.toContain('unrelated');
        expect(layout.nodes.map(node => node.id)).toEqual(expect.arrayContaining(['root', 'child', 'extension']));
        expect(layout.edges.find(edge => edge.id === 'e')).toMatchObject({ label: '«extends»', type: 'bezier' });
    });

    it('reads depth and routing from model-owned presentation hints', () => {
        expect(useCaseViewOptions({ layoutHint: 'usecase:level=1;edge=straight' }))
            .toEqual({ level: 1, edgeStyle: 'straight' });
    });
});
