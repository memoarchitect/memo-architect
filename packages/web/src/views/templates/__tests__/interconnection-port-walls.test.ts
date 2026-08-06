// ─── Four-sided boundary ports, end to end through the template ──────────────
//
// The governing rule for the IBD is that the tool must not decide what kind of
// diagram you can draw. A port on the case FLOOR — the reference drawing's
// Power Switch, Power In, Fuse Access and Equipotential Cable — was previously
// placeable only by hand in the layout companion, because the template dealt
// every port down the left or right wall from its direction alone. These tests
// drive `computeInterconnectionLayout` itself: a wall the view declares is
// honoured by automatic layout, and an undeclared port still falls back to its
// direction.

import { describe, it, expect } from 'vitest';
import type { MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';
import {
    computeInterconnectionLayout, INTERCONNECTION_PORT_SIZE,
    type PortInfo, type PortSide,
} from '../interconnection-view';

const SIZE = INTERCONNECTION_PORT_SIZE;

const part = (id: string, overrides: Partial<MemoElement> = {}): MemoElement => ({
    id, name: id, kind: 'HardwareAssembly', construct: 'part',
    layer: 'physical', file: 'test.sysml', attributes: {},
    ...overrides,
});

const port = (id: string, owner: string, direction: 'in' | 'out'): MemoElement => ({
    id, name: id, kind: 'DataPort', construct: 'port',
    layer: 'physical', file: 'test.sysml', attributes: {},
    owner, portSpec: { type: 'DataPort', direction, isConjugated: false } as never,
});

const nestedPort = (id: string, parentPortId: string): MemoElement => ({
    id, name: id, kind: 'DataPort', construct: 'port',
    layer: 'physical', file: 'test.sysml', attributes: {},
    owner: parentPortId, portSpec: { type: 'DataPort', isConjugated: false } as never,
});

const rel = (id: string, type: string, sourceId: string, targetId: string) => ({
    id, type, sourceId, targetId, sourceEnd: '', targetEnd: '', file: 'test.sysml',
});

/** A case frame with one board inside it and connectors out to the wall. */
function pumpLikeModel(): MemoModelDTO {
    const elements = [
        part('case'),
        part('board', { kind: 'HardwareComponent' }),
        port('powerIn', 'board', 'in'),
        port('dataOut', 'board', 'out'),
        // The wall features: one plain bottom-wall connector and one service
        // panel carrying nested ports.
        port('mainsInlet', 'case', 'in'),
        port('servicePanel', 'case', 'in'),
        nestedPort('powerSwitch', 'servicePanel'),
        nestedPort('fuseAccess', 'servicePanel'),
        port('rs485Wall', 'case', 'out'),
    ];
    return {
        elements: Object.fromEntries(elements.map(el => [el.id, el])),
        relationships: [
            rel('c1', 'composes', 'case', 'board'),
            rel('w1', 'ExchangesWith', 'mainsInlet', 'powerIn'),
            rel('w2', 'ExchangesWith', 'powerSwitch', 'powerIn'),
            rel('w3', 'ExchangesWith', 'dataOut', 'rs485Wall'),
        ],
        errors: [],
    } as unknown as MemoModelDTO;
}

const portsOf = (nodes: Array<{ id: string; data: unknown }>, nodeId: string): PortInfo[] =>
    (nodes.find(n => n.id === nodeId)!.data as { ports: PortInfo[] }).ports;

const byId = (ports: PortInfo[], id: string): PortInfo => ports.find(p => p.id === id)!;

describe('declared port walls drive automatic layout', () => {
    it('places a declared bottom-wall port on the floor, not on a side', async () => {
        const walls = new Map<string, PortSide>([
            ['mainsInlet', 'bottom'],
            ['servicePanel', 'bottom'],
        ]);
        const { nodes } = await computeInterconnectionLayout(pumpLikeModel(), { portWalls: walls });
        const frame = nodes.find(n => n.id === 'case')!;
        const ports = portsOf(nodes as never, 'case');
        const frameHeight = Number((frame.style as { height: number }).height);

        for (const id of ['mainsInlet', 'servicePanel']) {
            const p = byId(ports, id);
            expect(p.side).toBe('bottom');
            expect(p.y).toBeCloseTo(frameHeight - SIZE / 2);
        }
        // an undeclared port keeps its direction-derived wall
        expect(byId(ports, 'rs485Wall').side).toBe('right');
        // and the two floor ports do not sit on top of each other
        expect(Math.abs(byId(ports, 'mainsInlet').x - byId(ports, 'servicePanel').x))
            .toBeGreaterThan(SIZE);
    });

    it('runs a nested group along the wall it is on', async () => {
        const { nodes } = await computeInterconnectionLayout(pumpLikeModel(), {
            portWalls: new Map<string, PortSide>([['servicePanel', 'bottom']]),
        });
        const ports = portsOf(nodes as never, 'case');
        const parent = byId(ports, 'servicePanel');
        const nested = ['powerSwitch', 'fuseAccess'].map(id => byId(ports, id));

        expect(parent.nestedCount).toBe(2);
        for (const child of nested) {
            // a nested port inherits its parent's wall without declaring one
            expect(child.side).toBe('bottom');
            // the group grows ACROSS the floor, so every square stays on it
            expect(child.y).toBeCloseTo(parent.y);
            expect(child.x).toBeGreaterThan(parent.x);
        }
        expect(nested[1].x).toBeGreaterThan(nested[0].x);
    });

    it('keeps every port inside its owner box on the declared wall', async () => {
        const { nodes } = await computeInterconnectionLayout(pumpLikeModel(), {
            portWalls: new Map<string, PortSide>([
                ['mainsInlet', 'bottom'], ['servicePanel', 'bottom'], ['rs485Wall', 'top'],
            ]),
        });
        const frame = nodes.find(n => n.id === 'case')!;
        const width = Number((frame.style as { width: number }).width);
        const ports = portsOf(nodes as never, 'case');

        expect(byId(ports, 'rs485Wall').y).toBeCloseTo(-SIZE / 2);
        for (const p of ports) {
            if (p.side !== 'bottom' && p.side !== 'top') continue;
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.x + (p.size ?? SIZE)).toBeLessThanOrEqual(width);
        }
    });

    it('leaves an undeclared model laid out exactly as before', async () => {
        const plain = await computeInterconnectionLayout(pumpLikeModel());
        for (const p of portsOf(plain.nodes as never, 'case')) {
            expect(['left', 'right']).toContain(p.side);
        }
    });
});
