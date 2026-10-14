import { describe, expect, it } from 'vitest';
import type { MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';
import { actionDrillSource, childrenOf, definitionSubtree, drillPath, enterLevel } from './system-navigator';

const el = (id: string, patch: Partial<MemoElement> = {}): MemoElement => ({
    id, name: id.split('::').pop()!, kind: 'ActionUsage', construct: 'action',
    layer: 'functional', file: 'x.sysml', attributes: {}, ...patch,
});

/** A definition that owns two steps, a usage typed by it, and one action that owns its own step. */
function model(): MemoModelDTO {
    const elements = [
        el('p::Verify', { isDefinition: true, kind: 'ActionDefinition' }),
        el('p::Verify::compare', { parentAction: 'p::Verify', owner: 'p::Verify' }),
        el('p::Verify::sign', { parentAction: 'p::Verify', owner: 'p::Verify' }),
        el('p::flow', {}),
        el('p::flow::confirm', { parentAction: 'p::flow', owner: 'p::flow' }),
        el('p::flow::confirm::own', { parentAction: 'p::flow::confirm', owner: 'p::flow::confirm' }),
        el('p::flow::leaf', { parentAction: 'p::flow', owner: 'p::flow' }),
        el('p::Motor', { isDefinition: true, construct: 'part', kind: 'PartDefinition' }),
        el('p::Motor::rotor', { construct: 'part', kind: 'LogicalComponent', owner: 'p::Motor' }),
        el('p::drive', { construct: 'part', kind: 'LogicalComponent' }),
        el('p::drive::motor', { construct: 'part', kind: 'LogicalComponent', owner: 'p::drive' }),
    ];
    return {
        elements: Object.fromEntries(elements.map(e => [e.id, e])),
        relationships: [], diagrams: [],
        workspaceMembership: {
            workspaces: [],
            definitionOf: { 'p::flow::confirm': 'p::Verify', 'p::flow::leaf': 'p::Nothing', 'p::drive::motor': 'p::Motor' },
        },
    } as unknown as MemoModelDTO;
}

describe('what an action opens into', () => {
    it('is its own steps when it owns some', () => {
        const m = model();
        m.workspaceMembership!.definitionOf['p::flow::confirm'] = 'p::Verify';
        expect(actionDrillSource(m, 'p::flow::confirm')).toBe('p::flow::confirm');
    });

    it('is the definition it is typed by when it owns none', () => {
        const m = model();
        delete m.elements['p::flow::confirm::own'];
        expect(actionDrillSource(m, 'p::flow::confirm')).toBe('p::Verify');
    });

    it('is nothing for a leaf, or one typed by a definition that owns no steps', () => {
        expect(actionDrillSource(model(), 'p::flow::leaf')).toBeUndefined();
        expect(actionDrillSource(model(), 'p::Verify::sign')).toBeUndefined();
    });
});

describe('what a part opens into without the view drawing it', () => {
    it('is the parts of its definition, and the subtree it brings with it', () => {
        const m = model();
        expect(childrenOf(m, 'p::drive::motor').map(c => c.id)).toEqual(['p::Motor::rotor']);
        expect(definitionSubtree(m, 'p::Motor')).toEqual(['p::Motor', 'p::Motor::rotor']);
    });

    it('brings the steps of an action definition, which record a parent action and no owner', () => {
        const m = model();
        for (const id of ['p::Verify::compare', 'p::Verify::sign']) delete (m.elements[id] as { owner?: string }).owner;
        expect(definitionSubtree(m, 'p::Verify')).toEqual(['p::Verify', 'p::Verify::compare', 'p::Verify::sign']);
    });
});

describe('the way out of a drill', () => {
    it('is the way in, one level at a time, when the drill ended on the focused level', () => {
        let trail = enterLevel([], 'p::Motor');
        trail = enterLevel(trail, 'p::Motor::stator');
        expect(drillPath(trail, 'p::Motor::stator', ['p::Motor::stator'])).toEqual(['p::Motor', 'p::Motor::stator']);
    });

    it('returns to a level already on the trail instead of adding it again', () => {
        expect(enterLevel(['a', 'b', 'c'], 'b')).toEqual(['a', 'b']);
    });

    it('falls back to the ancestry the model gives when the focus was set some other way', () => {
        expect(drillPath(['a'], 'z', ['y', 'z'])).toEqual(['y', 'z']);
        expect(drillPath([], null, [])).toEqual([]);
    });
});
