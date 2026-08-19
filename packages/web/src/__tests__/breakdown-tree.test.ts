import { describe, it, expect } from 'vitest';
import { buildBreakdown, DEFAULT_FAMILIES } from '../lib/breakdown-tree';
import type { MemoElement } from '@memoarchitect/tools/browser';

const el = (id: string, construct: string, layer: string, owner?: string,
            attributes: Record<string, string> = {}): MemoElement =>
    ({ id, name: id, kind: 'K', construct, layer, file: 't.sysml', attributes, owner }) as MemoElement;

describe('the explorer breakdown', () => {
    it('nests an owned element under its owner instead of listing it flat', () => {
        // The catalog puts the port in a Ports folder. Reading a system needs it
        // on the component that owns it.
        const branches = buildBreakdown([
            el('pump', 'part', 'logical'),
            el('pumpPort', 'port', 'logical', 'pump'),
        ]);
        const logical = branches.find(b => b.id === 'logical')!;
        expect(logical.nodes.map(n => n.id)).toEqual(['pump']);
        expect(logical.nodes[0].children.map(n => n.id)).toEqual(['pumpPort']);
    });

    it('an owned element is never also a root', () => {
        const branches = buildBreakdown([
            el('sys', 'part', 'logical'),
            el('sub', 'part', 'logical', 'sys'),
        ]);
        const logical = branches.find(b => b.id === 'logical')!;
        expect(logical.nodes.map(n => n.id)).toEqual(['sys']);
    });

    it('an element owned by something outside the model stays a root', () => {
        // Otherwise it disappears entirely, which is worse than showing it flat.
        const branches = buildBreakdown([el('orphan', 'part', 'logical', 'notInModel')]);
        expect(branches.find(b => b.id === 'logical')!.nodes.map(n => n.id)).toEqual(['orphan']);
    });

    it('terminates on an ownership cycle', () => {
        const a = el('a', 'part', 'logical', 'b');
        const b = el('b', 'part', 'logical', 'a');
        // Both are owned, so neither is a root and the branch is simply empty —
        // the point is that this returns at all.
        expect(() => buildBreakdown([a, b])).not.toThrow();
    });

    it('groups members of a nested package under it, without changing ownership', () => {
        const branches = buildBreakdown([
            el('screen', 'part', 'implementation'),
            el('btnBack', 'part', 'implementation', 'screen', { elementPackage: 'grpHeader' }),
            el('btnClose', 'part', 'implementation', 'screen', { elementPackage: 'grpHeader' }),
            el('footer', 'part', 'implementation', 'screen'),
        ]);
        const sw = branches.find(b => b.id === 'software')!;
        const children = sw.nodes[0].children;
        expect(children.map(n => n.name)).toEqual(['grpHeader', 'footer']);
        expect(children[0].isGroup).toBe(true);
        expect(children[0].children.map(n => n.id)).toEqual(['btnBack', 'btnClose']);
    });

    it('search keeps a parent whose descendant matches', () => {
        const branches = buildBreakdown([
            el('pump', 'part', 'logical'),
            el('occlusionSensor', 'part', 'logical', 'pump'),
        ], DEFAULT_FAMILIES, 'occlusion');
        expect(branches.find(b => b.id === 'logical')!.nodes.map(n => n.id)).toEqual(['pump']);
    });

    it('drops a family with nothing in it', () => {
        const branches = buildBreakdown([el('uc', 'use case', 'operational')]);
        expect(branches.map(b => b.id)).toEqual(['usecases']);
    });
});

describe('usages nest under the definition they instantiate', () => {
    const def = (id: string, construct: string, layer: string): MemoElement =>
        ({ id, name: id, kind: 'ActionDefinition', construct, layer, file: 't.sysml', attributes: {} }) as MemoElement;
    const usage = (id: string, defName: string): MemoElement =>
        ({ id, name: id, kind: defName, construct: 'action', layer: 'behavior', file: 't.sysml', attributes: {} }) as MemoElement;

    it('a usage is a child of its def, not a sibling', () => {
        // Measured in the live app: `AcquireSensorData` (ActionDefinition) and
        // `acquireSensors` (a usage of it) were listed side by side.
        const branches = buildBreakdown([
            def('AcquireSensorData', 'action', 'behavior'),
            usage('acquireSensors', 'AcquireSensorData'),
        ]);
        const fns = branches.find(b => b.id === 'functions')!;
        expect(fns.nodes.map(n => n.id)).toEqual(['AcquireSensorData']);
        expect(fns.nodes[0].children.map(n => n.id)).toEqual(['acquireSensors']);
    });

    it('a usage of an ontology kind has no local def and stays a root', () => {
        const branches = buildBreakdown([usage('somethingElse', 'SoftwareModule')]);
        expect(branches.flatMap(b => b.nodes.map(n => n.id))).toContain('somethingElse');
    });

    it('an explicit owner wins over the definition link', () => {
        const owned = { ...usage('acquireSensors', 'AcquireSensorData'), owner: 'pump' } as MemoElement;
        const branches = buildBreakdown([
            def('AcquireSensorData', 'action', 'behavior'),
            { id: 'pump', name: 'pump', kind: 'K', construct: 'part', layer: 'logical', file: 't.sysml', attributes: {} } as MemoElement,
            owned,
        ]);
        const logical = branches.find(b => b.id === 'logical')!;
        expect(logical.nodes[0].children.map(n => n.id)).toEqual(['acquireSensors']);
        expect(branches.find(b => b.id === 'functions')!.nodes[0].children).toEqual([]);
    });
});

describe('system grouping', () => {
    const systemOf = (element: { owner?: string }) => element.owner === 'pump'
        ? { systemId: 'pump', label: 'InfusionPump' }
        : { label: 'Global' };

    it('files use cases under their system, with the untraced ones under Global', () => {
        const families = DEFAULT_FAMILIES.map(family => family.id === 'usecases'
            ? { ...family, systemOf }
            : family);
        const branches = buildBreakdown([
            { id: 'pump', name: 'InfusionPump', kind: 'System', construct: 'part', layer: 'logical' },
            { id: 'uc1', name: 'DeliverTherapy', kind: 'UseCase', construct: 'use case', layer: 'operational', owner: 'pump' },
            { id: 'uc2', name: 'ServiceDevice', kind: 'UseCase', construct: 'use case', layer: 'operational' },
        ] as never, families);
        const useCases = branches.find(branch => branch.id === 'usecases')!;
        expect(useCases.nodes.map(node => node.name)).toEqual(['InfusionPump', 'Global']);
        expect(useCases.nodes[0].children.map(node => node.name)).toEqual(['DeliverTherapy']);
        expect(useCases.nodes[1].children.map(node => node.name)).toEqual(['ServiceDevice']);
    });
});
