// ─── Connector hover tests ───────────────────────────────────────────────────
//
// The hover subject is shared by every diagram kind, so what is locked here is
// the contract each view relies on: which ids a connector can be traced by, and
// when a connector or endpoint counts as taking part.

import { describe, it, expect, beforeEach } from 'vitest';
import type { Edge } from '@xyflow/react';
import { connectorEndpoints, setConnectorHover, connectorTakesPart } from '../connector-hover';

const edge = (overrides: Partial<Edge> = {}): Edge => ({
    id: 'rel-1', source: 'pump', target: 'reservoir', ...overrides,
});

describe('connectorEndpoints', () => {
    it('traces a plain connector by the parts at its ends', () => {
        expect(connectorEndpoints(edge())).toEqual(['pump', 'reservoir']);
    });

    it('also traces a ported connector by the ports it anchors to', () => {
        const ported = edge({ data: { sourcePortId: 'tankWaterOut', targetPortId: 'heaterWaterIn' } });
        expect(connectorEndpoints(ported)).toEqual(['pump', 'reservoir', 'tankWaterOut', 'heaterWaterIn']);
    });

    it('keeps the parts when only one end has a port', () => {
        expect(connectorEndpoints(edge({ data: { targetPortId: 'heaterWaterIn' } })))
            .toEqual(['pump', 'reservoir', 'heaterWaterIn']);
    });
});

describe('connectorTakesPart', () => {
    beforeEach(() => setConnectorHover(null));

    it('lights the connector being pointed at', () => {
        expect(connectorTakesPart({ edgeId: 'rel-1', endpointIds: [] }, edge())).toBe(true);
    });

    it('lights every connector wired to a hovered part', () => {
        const subject = { endpointIds: ['reservoir'] };
        expect(connectorTakesPart(subject, edge())).toBe(true);
        expect(connectorTakesPart(subject, edge({ id: 'rel-2', source: 'cup', target: 'sink' }))).toBe(false);
    });

    it('lights a connector wired to a hovered port, not just to its owner', () => {
        const ported = edge({ data: { sourcePortId: 'tankWaterOut' } });
        expect(connectorTakesPart({ endpointIds: ['tankWaterOut'] }, ported)).toBe(true);
        expect(connectorTakesPart({ endpointIds: ['tankWaterIn'] }, ported)).toBe(false);
    });
});
