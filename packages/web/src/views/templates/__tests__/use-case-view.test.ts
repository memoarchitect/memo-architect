import { describe, expect, it } from 'vitest';
import { computeUseCaseViewLayout, isUseCase, isUseCaseActor, useCaseActorOptions, useCaseMaxDepth, useCaseViewOptions } from '../use-case-view';

const el = (id: string, kind: string, name = id) => ({ id, kind, name, construct: kind === 'UseCase' ? 'use case' : 'part', layer: 'operational', file: 'test.sysml', attributes: {} });
const model = (elements: Record<string, any>, relationships: any[] = []) => ({ elements, relationships, errors: [] }) as any;

describe('use-case view template', () => {
    it('balances a flat set of root use cases into readable columns', () => {
        const actor = el('actor', 'Actor');
        const cases = Object.fromEntries(Array.from({ length: 8 }, (_, index) => {
            const useCase = el(`case-${index}`, 'UseCase', `Use case ${index + 1}`);
            return [useCase.id, useCase];
        }));
        const relationships = Object.keys(cases).map((id, index) => ({
            id: `rel-${index}`, type: 'participatesIn', sourceId: actor.id, targetId: id,
        }));
        const layout = computeUseCaseViewLayout(model({ actor, ...cases }, relationships));
        const useCaseNodes = layout.nodes.filter(node => node.type === 'useCase');

        expect(new Set(useCaseNodes.map(node => node.position.x)).size).toBe(2);
        const boundary = layout.nodes.find(node => node.id === '__use_case_boundary__');
        expect(Number(boundary?.style?.height)).toBeLessThan(700);
    });

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
        expect(useCaseMaxDepth(model({ root, child, extension }, [{ id: 'i', type: 'includes', sourceId: 'root', targetId: 'child' }]))).toBe(1);
        expect(layout.edges.find(edge => edge.id === 'e')).toMatchObject({ label: '«extends»', type: 'useCaseEdge', data: { routing: 'curved' } });
    });

    it('offers participating actors and can hide their associated use cases', () => {
        const nurse = el('nurse', 'User', 'Nurse');
        const patient = el('patient', 'User', 'Patient');
        const review = el('review', 'UseCase');
        const configure = el('configure', 'UseCase');
        const fixture = model({ nurse, patient, review, configure }, [
            { id: 'n', type: 'Initiates', sourceId: 'nurse', targetId: 'review' },
            { id: 'p', type: 'ParticipatesIn', sourceId: 'patient', targetId: 'configure' },
        ]);
        expect(useCaseActorOptions(fixture).map(actor => actor.name)).toEqual(['Nurse', 'Patient']);
        const layout = computeUseCaseViewLayout(fixture, { hiddenActorIds: new Set(['nurse']) });
        expect(layout.nodes.map(node => node.id)).not.toContain('review');
        expect(layout.nodes.map(node => node.id)).toContain('configure');
    });

    it('reads depth and routing from model-owned presentation hints', () => {
        expect(useCaseViewOptions()).toEqual({ level: 'all', edgeStyle: 'straight' });
        expect(useCaseViewOptions({ layoutHint: 'usecase:level=1;edge=straight' }))
            .toEqual({ level: 1, edgeStyle: 'straight' });
    });

    it('supports Miro-style straight, elbow, rounded, curved, and arc routes', () => {
        const actor = el('actor', 'User');
        const useCase = el('useCase', 'UseCase');
        const fixture = model({ actor, useCase }, [{ id: 'a', type: 'initiates', sourceId: 'actor', targetId: 'useCase' }]);
        expect(computeUseCaseViewLayout(fixture).edges[0]).toMatchObject({ data: { routing: 'straight' } });
        expect(computeUseCaseViewLayout(fixture, { edgeStyle: 'straight' }).edges[0]).toMatchObject({ type: 'useCaseEdge', data: { routing: 'straight' } });
        expect(computeUseCaseViewLayout(fixture, { edgeStyle: 'elbow' }).edges[0]).toMatchObject({ type: 'useCaseEdge', data: { routing: 'elbow' } });
        expect(computeUseCaseViewLayout(fixture, { edgeStyle: 'rounded' }).edges[0]).toMatchObject({ type: 'useCaseEdge', data: { routing: 'rounded' } });
        expect(computeUseCaseViewLayout(fixture, { edgeStyle: 'curved' }).edges[0]).toMatchObject({ type: 'useCaseEdge', data: { routing: 'curved' } });
        expect(computeUseCaseViewLayout(fixture, { edgeStyle: 'arc' }).edges[0]).toMatchObject({ type: 'useCaseEdge', data: { routing: 'arc' } });
    });

    it('places include ranks left-to-right and an extending use case below its base', () => {
        const root = el('root', 'UseCase');
        const child = el('child', 'UseCase');
        const extension = el('extension', 'UseCase');
        const layout = computeUseCaseViewLayout(model({ root, child, extension }, [
            { id: 'include', type: 'includes', sourceId: 'root', targetId: 'child' },
            { id: 'extend', type: 'extends', sourceId: 'extension', targetId: 'child' },
        ]));
        const rootPosition = layout.nodes.find(node => node.id === 'root')!.position;
        const childPosition = layout.nodes.find(node => node.id === 'child')!.position;
        const extensionPosition = layout.nodes.find(node => node.id === 'extension')!.position;
        expect(childPosition.x).toBeGreaterThan(rootPosition.x);
        expect(extensionPosition).toMatchObject({ x: childPosition.x });
        expect(extensionPosition.y).toBeGreaterThan(childPosition.y);
    });

    it('accepts canonical lower-camel relationship types from the semantic model', () => {
        const clinician = el('clinician', 'User');
        const root = el('root', 'UseCase');
        const child = el('child', 'UseCase');
        const grandchild = el('grandchild', 'UseCase');
        const layout = computeUseCaseViewLayout(model({ clinician, root, child, grandchild }, [
            { id: 'a', type: 'initiates', sourceId: 'clinician', targetId: 'root' },
            { id: 'i1', type: 'includes', sourceId: 'root', targetId: 'child' },
            { id: 'i2', type: 'includes', sourceId: 'child', targetId: 'grandchild' },
        ]));
        expect(layout.nodes.filter(node => node.type === 'useCaseActor')).toHaveLength(1);
        expect(layout.edges).toHaveLength(3);
        expect(layout.edges[1].data).toMatchObject({ routing: 'straight', points: [] });
        // An association leaves the actor's facing side and enters the case's,
        // both at mid-height, so the run is a straight horizontal.
        const actor = layout.nodes.find(node => node.id === 'clinician')!;
        const association = layout.edges[0].data as {
            sourceOffset: { x: number; y: number }; targetOffset: { x: number; y: number };
            sourceSide: string; targetSide: string;
        };
        expect(association).toMatchObject({ sourceSide: 'right', targetSide: 'left' });
        expect(association.sourceOffset.x).toBe(Number(actor.style?.width));
        expect(association.sourceOffset.y).toBe(Number(actor.style?.height) / 2);
        expect(association.targetOffset.x).toBe(0);
        expect(useCaseMaxDepth(model({ root, child, grandchild }, [
            { id: 'i1', type: 'includes', sourceId: 'root', targetId: 'child' },
            { id: 'i2', type: 'includes', sourceId: 'child', targetId: 'grandchild' },
        ]))).toBe(2);
    });
});
