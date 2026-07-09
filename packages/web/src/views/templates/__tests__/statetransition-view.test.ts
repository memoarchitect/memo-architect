// ─── State Transition template tests (KK-5 structure logic) ─────────────────

import { describe, it, expect } from 'vitest';
import type { MemoElement, MemoModelDTO } from '@memo/core';
import {
    classifyStateTransitionElements, resolveTransitions, transitionLabel,
    isTransitionElement, isStateElement,
} from '../statetransition-view';

function el(id: string, overrides: Partial<MemoElement> = {}): MemoElement {
    return {
        id,
        name: id,
        kind: 'ModeState',
        construct: 'part',
        layer: 'behavior',
        file: 'test.sysml',
        attributes: {},
        ...overrides,
    };
}

function model(elements: MemoElement[]): MemoModelDTO {
    return {
        elements: Object.fromEntries(elements.map(e => [e.id, e])),
        relationships: [],
        errors: [],
    } as unknown as MemoModelDTO;
}

describe('classifyStateTransitionElements', () => {
    it('splits states, transitions, and annotations', () => {
        const m = model([
            el('machine', { kind: 'BehaviorMachine' }),
            el('off', { name: 'OFF' }),
            el('tr1', {
                kind: 'Transition',
                attributes: { sourceState: 'OFF', targetState: 'ON' },
            }),
            el('prop', { kind: 'BehaviorProperty' }),
        ]);
        const { states, transitions, annotations } = classifyStateTransitionElements(m);
        expect(states.map(s => s.id).sort()).toEqual(['machine', 'off']);
        expect(transitions.map(t => t.id)).toEqual(['tr1']);
        expect(annotations.map(a => a.id)).toEqual(['prop']);
    });

    it('recognizes transitions by sourceState/targetState attributes regardless of kind', () => {
        expect(isTransitionElement(el('x', {
            kind: 'CustomEdgeKind',
            attributes: { sourceState: 'A', targetState: 'B' },
        }))).toBe(true);
        expect(isStateElement(el('m', { kind: 'BehaviorMachine' }))).toBe(true);
        expect(isStateElement(el('p', { kind: 'BehaviorProperty' }))).toBe(false);
    });
});

describe('resolveTransitions', () => {
    it('resolves endpoints by state display name and drops unresolvable ones', () => {
        const states = [
            el('modeOFF', { name: 'OFF' }),
            el('modeIdle', { name: 'ON.IDLE' }),
        ];
        const transitions = [
            el('tr1', { kind: 'Transition', attributes: { sourceState: 'OFF', targetState: 'ON.IDLE', trigger: 'start' } }),
            el('tr2', { kind: 'Transition', attributes: { sourceState: 'OFF', targetState: 'MISSING' } }),
        ];
        const resolved = resolveTransitions(transitions, states);
        expect(resolved).toHaveLength(1);
        expect(resolved[0]).toMatchObject({ sourceId: 'modeOFF', targetId: 'modeIdle', label: 'start' });
    });
});

describe('transitionLabel', () => {
    it('formats trigger [guard] and skips "none" guards', () => {
        expect(transitionLabel(el('t', {
            attributes: { trigger: 'evStart', guardSummary: 'battery ok' },
        }))).toBe('evStart [battery ok]');
        expect(transitionLabel(el('t', {
            attributes: { trigger: 'evStop', guardSummary: 'none — always allowed' },
        }))).toBe('evStop');
    });

    it('clips over-long labels', () => {
        const label = transitionLabel(el('t', {
            attributes: { trigger: 'x'.repeat(80) },
        }));
        expect(label.length).toBeLessThanOrEqual(46);
        expect(label.endsWith('…')).toBe(true);
    });
});
