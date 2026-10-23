import { describe, it, expect } from 'vitest';
import type { MemoModelDTO, InterfaceBetween } from '@memoarchitect/tools/browser';
import { crossFamilyInterfaces, interfaceCompatibility, portFamiliesByPart } from '../interface-compat';

const el = (id: string, construct: string, kind: string, owner?: string) =>
    ({ id, name: id.split('::').pop(), construct, kind, owner, attributes: {} });

const model = {
    registries: {
        kinds: [
            { name: 'MemoPort', construct: 'port def' },
            { name: 'SoftwarePort', construct: 'port def', superType: 'MemoPort' },
            { name: 'RosPort', construct: 'port def', superType: 'SoftwarePort' },
            { name: 'PhysicalPort', construct: 'port def', superType: 'MemoPort' },
        ],
    },
    elements: {
        app: el('app', 'part', 'Part'), appOut: el('appOut', 'port', 'RosPort', 'app'),
        svc: el('svc', 'part', 'Part'), svcIn: el('svcIn', 'port', 'SoftwarePort', 'svc'),
        board: el('board', 'part', 'Part'), boardPin: el('boardPin', 'port', 'PhysicalPort', 'board'),
        outer: el('outer', 'part', 'Part'), inner: el('inner', 'part', 'Part', 'outer'), innerPin: el('innerPin', 'port', 'PhysicalPort', 'inner'),
        bare: el('bare', 'part', 'Part'),
    },
    relationships: [],
} as unknown as MemoModelDTO;

describe('interface compatibility', () => {
    it('puts a specialized port in the family just under the root', () => {
        expect([...portFamiliesByPart(model).get('app')!]).toEqual(['SoftwarePort']);
    });

    it('lets two software parts have an interface, including through a specialized port', () => {
        expect(interfaceCompatibility(model, 'app', 'svc')).toEqual({ ok: true });
    });

    it('refuses software to hardware, and says why', () => {
        const verdict = interfaceCompatibility(model, 'app', 'board');
        expect(verdict.ok).toBe(false);
        expect(!verdict.ok && verdict.reason).toContain('allocation');
    });

    it('counts the ports of nested parts as the outer part\'s', () => {
        expect(interfaceCompatibility(model, 'board', 'outer')).toEqual({ ok: true });
        expect(interfaceCompatibility(model, 'app', 'outer').ok).toBe(false);
    });

    it('does not rule out a part with no ports', () => {
        expect(interfaceCompatibility(model, 'app', 'bare')).toEqual({ ok: true, note: 'no-ports' });
    });

    it('flags a found interface whose end ports are in different families', () => {
        const found = (from: string, to: string) => ({ id: 'x', name: 'x', attributes: {}, reversed: false, from: { portId: from, ownerId: 'a' }, to: { portId: to, ownerId: 'b' } }) as InterfaceBetween;
        expect(crossFamilyInterfaces(model, [found('appOut', 'svcIn'), found('appOut', 'boardPin')]).length).toBe(1);
    });
});
