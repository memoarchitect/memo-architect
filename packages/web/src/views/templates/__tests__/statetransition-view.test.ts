// ─── State Transition template tests (KK-5 structure logic) ─────────────────

import { describe, it, expect } from 'vitest';
import type { MemoElement, MemoModelDTO, MemoRelationship } from '@memoarchitect/tools/browser';
import {
    classifyStateTransitionElements, resolveTransitions, transitionLabel,
    isTransitionElement, isStateElement,
    projectStateHierarchy, liftTransitions, stateAncestry,
} from '../statetransition-view';
import { buildCompositionTree } from '../composition-tree';

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
            el('machine', { kind: 'StateMachine' }),
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
        expect(isStateElement(el('m', { kind: 'StateMachine' }))).toBe(true);
        expect(isStateElement(el('p', { kind: 'BehaviorProperty' }))).toBe(false);
    });
});

describe('resolveTransitions', () => {
    it('resolves native state IDs, with display names as the legacy fallback', () => {
        const states = [
            el('modeOFF', { name: 'OFF' }),
            el('modeIdle', { name: 'ON.IDLE' }),
        ];
        const transitions = [
            el('tr1', { kind: 'Transition', attributes: { sourceState: 'modeOFF', targetState: 'modeIdle', trigger: 'start' } }),
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

// ─── Nesting: fold in place, or drill into a sub-machine ────────────────────

function rel(sourceId: string, targetId: string): MemoRelationship {
    return { id: `${sourceId}->${targetId}`, type: 'composedOf', sourceId, targetId } as MemoRelationship;
}

/** machine ▸ OFF, ON ▸ (ON ▸ IDLE, RUN ▸ (RUN ▸ FAST)) */
function machineTree() {
    const states = [
        el('machine', { kind: 'StateMachine' }),
        el('off', { name: 'OFF' }),
        el('on', { name: 'ON' }),
        el('idle', { name: 'IDLE' }),
        el('run', { name: 'RUN' }),
        el('fast', { name: 'FAST' }),
    ];
    return buildCompositionTree(states, [
        rel('machine', 'off'), rel('machine', 'on'),
        rel('on', 'idle'), rel('on', 'run'),
        rel('run', 'fast'),
    ]);
}

describe('projectStateHierarchy', () => {
    it('draws the whole machine when nothing is folded or focused', () => {
        const { visible, roots, liftTo } = projectStateHierarchy(machineTree());
        expect(roots).toEqual(['machine']);
        expect([...visible].sort()).toEqual(['fast', 'idle', 'machine', 'off', 'on', 'run']);
        expect(liftTo.size).toBe(0);
    });

    it('folds a composite and counts every descendant it hides', () => {
        const { visible, liftTo, hiddenCount } = projectStateHierarchy(machineTree(), {
            collapsedStateIds: new Set(['on']),
        });
        expect(visible.has('on')).toBe(true);
        expect(visible.has('idle')).toBe(false);
        expect(visible.has('fast')).toBe(false);
        // Deep descendants fold onto the nearest folded ancestor, not their parent.
        expect(liftTo.get('fast')).toBe('on');
        expect(hiddenCount.get('on')).toBe(3);
    });

    it('re-roots the diagram at a focused composite', () => {
        const { roots, visible } = projectStateHierarchy(machineTree(), { focusStateId: 'on' });
        expect(roots).toEqual(['idle', 'run']);
        expect(visible.has('machine')).toBe(false);
        expect(visible.has('off')).toBe(false);
        expect(visible.has('fast')).toBe(true);
    });

    it('falls back to the whole machine when the focused state has no substates', () => {
        const { roots } = projectStateHierarchy(machineTree(), { focusStateId: 'off' });
        expect(roots).toEqual(['machine']);
    });

    it('combines a focus with folds inside it', () => {
        const { visible } = projectStateHierarchy(machineTree(), {
            focusStateId: 'on', collapsedStateIds: new Set(['run']),
        });
        expect(visible.has('run')).toBe(true);
        expect(visible.has('fast')).toBe(false);
    });
});

describe('liftTransitions', () => {
    const transition = (id: string, sourceId: string, targetId: string) =>
        ({ element: el(id), sourceId, targetId, label: id });

    it('re-points a transition into a folded substate onto the composite', () => {
        const projection = projectStateHierarchy(machineTree(), {
            collapsedStateIds: new Set(['on']),
        });
        const lifted = liftTransitions([transition('t', 'off', 'idle')], projection);
        expect(lifted).toHaveLength(1);
        expect(lifted[0]).toMatchObject({ sourceId: 'off', targetId: 'on' });
    });

    it('drops a transition that folding turns into an internal one', () => {
        const projection = projectStateHierarchy(machineTree(), {
            collapsedStateIds: new Set(['on']),
        });
        expect(liftTransitions([transition('t', 'idle', 'run')], projection)).toEqual([]);
    });

    it('keeps a genuine self-transition', () => {
        const projection = projectStateHierarchy(machineTree());
        expect(liftTransitions([transition('t', 'idle', 'idle')], projection)).toHaveLength(1);
    });

    it('drops transitions reaching outside a drilled-into sub-machine', () => {
        const projection = projectStateHierarchy(machineTree(), { focusStateId: 'on' });
        const lifted = liftTransitions(
            [transition('in', 'idle', 'run'), transition('out', 'off', 'idle')], projection);
        expect(lifted.map(t => t.element.id)).toEqual(['in']);
    });
});

describe('stateAncestry', () => {
    it('returns the composition path outermost first', () => {
        expect(stateAncestry(machineTree(), 'fast')).toEqual(['machine', 'on', 'run', 'fast']);
    });
});
