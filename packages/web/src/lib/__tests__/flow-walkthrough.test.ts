import { describe, expect, it } from 'vitest';
import { autoStep, canStopHere, conditionStates, holdMs, itemsAt, stepConditions, walkEmphasis, walkFromParam, walkLength, walkStart, walkToParam, waysOn } from '../flow-walkthrough';

const control = (id: string, source: string, target: string, label?: string) => ({ id, source, target, label, data: { flowCategory: 'control' } });
const item = (id: string, source: string, target: string, flowItem: string) => ({ id, source, target, data: { flowCategory: 'data', flowItem } });
const nodes = ['r__start', 'a', 'd', 'b', 'c', 'lane'].map(id => ({ id }));
const edges = [control('s', 'r__start', 'a'), control('1', 'a', 'd'), control('2', 'd', 'b', '[ok]'), control('3', 'd', 'c', '[else]'), item('f', 'a', 'b', 'Sig')];

describe('the flow walkthrough graph', () => {
    it('starts at the start marker, or at the first step nothing leads to', () => {
        expect(walkStart(nodes, edges)).toBe('r__start');
        expect(walkStart(nodes.slice(1), edges.slice(1))).toBe('a');
    });
    it('follows successions and ignores item flows while there are any', () => {
        expect(waysOn('a', edges).map(p => p.targetId)).toEqual(['d']);
        expect(waysOn('d', edges).map(p => p.label)).toEqual(['[ok]', '[else]']);
    });
    it('walks item flows in a view with no succession', () => {
        expect(waysOn('a', [item('f', 'a', 'b', 'Sig')]).map(p => p.targetId)).toEqual(['b']);
    });
    it('goes on along an item flow from a step with no succession leaving it', () => {
        const mixed = [control('1', 'a', 'b'), item('f', 'b', 'c', 'Sig'), control('2', 'c', 'd')];
        expect(walkLength(['a'], mixed)).toBe(4);
    });
    it('offers a stop only where every way on is guarded and none is else', () => {
        expect(canStopHere(waysOn('d', edges))).toBe(false);
        expect(canStopHere([{ edgeId: 'x', targetId: 'b', label: '[ok]' }])).toBe(true);
        expect(canStopHere([{ edgeId: 'x', targetId: 'b' }])).toBe(false);
        expect(canStopHere([])).toBe(false);
    });
    it('counts the walk along the first way on, and survives a loop', () => {
        expect(walkLength(['r__start'], edges)).toBe(4);
        expect(walkLength(['a'], [control('x', 'a', 'b'), control('y', 'b', 'a')])).toBe(2);
    });
    it('keeps the way taken lit, shows the next steps, and leaves a lane alone', () => {
        const emphasis = walkEmphasis(['r__start', 'a', 'd'], edges);
        expect(['a', 'd', 'b', 'lane'].map(emphasis.node)).toEqual([1, 1, 0.75, 1]);
        expect(emphasis.edge(edges[1])).toBe(1);
        expect(emphasis.edge(edges[2])).toBe(1);
        expect(walkEmphasis(['r__start'], edges).edge(edges[2])).toBe(0.15);
    });
    it('names the items crossing at a step', () => {
        expect(itemsAt('b', edges)).toEqual({ receives: ['Sig'], sends: [] });
    });
});

describe('what a step checks', () => {
    const constraint = (id: string, owner: string, shortName: string, expression: string) => ({ id, owner, shortName, construct: 'constraint', attributes: { expression } });
    const model = {
        elements: {
            step: { id: 'step', attributes: { preCondition: 'patient assessed', postCondition: '<String>' } },
            def: { id: 'def', attributes: {} },
            pre: constraint('pre', 'step', 'precondition', 'rate >= 0'),
            post: constraint('post', 'def', 'postcondition', 'cmd >= 0'),
            other: constraint('other', 'step', 'someOther', 'x > 1'),
            twin: constraint('twin', 'def', 'precondition', 'rate >= 0'),
        },
        workspaceMembership: { definitionOf: { step: 'def' } },
    };
    it('lists the checks before a step, then after it, from the step and its definition, without repeats', () => {
        expect(stepConditions(model, 'step').map(c => [c.when, c.text])).toEqual([['before', 'rate >= 0'], ['before', 'patient assessed'], ['after', 'cmd >= 0']]);
    });
    it('has nothing for a step with no conditions', () => {
        expect(stepConditions(model, 'def').map(c => c.text)).toEqual(['rate >= 0', 'cmd >= 0']);
        expect(stepConditions(null, 'step')).toEqual([]);
    });
    it('stops on the check that failed: those before held, those after were never reached', () => {
        expect(conditionStates(3, undefined)).toEqual(['open', 'open', 'open']);
        expect(conditionStates(3, 1)).toEqual(['held', 'failed', 'unchecked']);
    });
});

describe('playing a walk', () => {
    it('holds a step long enough to read, within limits, and scales with speed', () => {
        expect(holdMs('short')).toBe(1400);
        expect(holdMs('x'.repeat(100))).toBe(5000);
        expect(holdMs('x'.repeat(100), 2)).toBe(2500);
        expect(holdMs('x'.repeat(10000))).toBe(15000);
    });
    it('goes on by itself only along one way to a new step', () => {
        expect(autoStep(['a'], [{ edgeId: 'e', targetId: 'b' }])?.targetId).toBe('b');
        expect(autoStep(['a', 'b'], [{ edgeId: 'e', targetId: 'a' }])).toBeUndefined();
        expect(autoStep(['a'], [{ edgeId: 'e', targetId: 'b' }, { edgeId: 'f', targetId: 'c' }])).toBeUndefined();
        expect(autoStep(['a'], [{ edgeId: 'e', targetId: 'b', label: '[ok]' }])).toBeUndefined();
        expect(autoStep(['a'], [])).toBeUndefined();
    });
});

describe('a walk in a link', () => {
    it('round-trips the branches taken', () => {
        const trail = ['r__start', 'a', 'd', 'c'];
        expect(walkToParam(trail, null, edges)).toBe('s.0.0.1');
        expect(walkFromParam('s.0.0.1', 'r__start', edges)).toEqual({ trail, stop: null });
    });
    it('round-trips where the walk stopped', () => {
        expect(walkToParam(['r__start'], { kind: 'guards' }, edges)).toBe('s.x');
        expect(walkFromParam('s.x', 'r__start', edges).stop).toEqual({ kind: 'guards' });
        expect(walkToParam(['r__start'], { kind: 'check', index: 2 }, edges)).toBe('s.c2');
        expect(walkFromParam('s.0.c2', 'r__start', edges)).toEqual({ trail: ['r__start', 'a'], stop: { kind: 'check', index: 2 } });
    });
    it('keeps what still exists when the model has changed, and ignores nonsense', () => {
        expect(walkFromParam('s.0.9.1', 'r__start', edges)).toEqual({ trail: ['r__start', 'a'], stop: null });
        expect(walkFromParam('nope', 'r__start', edges)).toEqual({ trail: ['r__start'], stop: null });
    });
});
