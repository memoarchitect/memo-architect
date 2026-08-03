// The client's half of §6.2: every write it sends carries the IR identity of
// the revision it was made against, so the server can tell an edit aimed at the
// current model from one aimed at a model that has since moved on.
//
// What this fixes on the client side is narrow but real: without the address,
// the server can only match on name, and a request the user made against an
// older revision succeeds against whatever now shares that name.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';

const sent: Array<{ type: string; payload: any }> = [];

/** Open on construction, so a request queued straight after connect is sent. */
class FakeSocket {
    static readonly OPEN = 1;
    static readonly CONNECTING = 0;
    readyState = 1;
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    onerror: (() => void) | null = null;
    onclose: (() => void) | null = null;
    constructor(readonly url: string) { /* nothing to dial */ }
    send(raw: string) { sent.push(JSON.parse(raw)); }
    close() { /* nothing to tear down */ }
}

vi.stubGlobal('WebSocket', FakeSocket as unknown as typeof WebSocket);
// The client is browser code; the suite runs in node. Only the two globals it
// reads on the connect path are needed, and stubbing exactly those keeps the
// test about addressing rather than about the DOM.
vi.stubGlobal('window', { location: { host: 'test' } });

const { useModelStore } = await import('../model-store');
const wsClient = await import('../ws-client');

function element(id: string): MemoElement {
    return {
        id, name: id, kind: 'SoftwareComponent', construct: 'part',
        layer: 'software', file: 'model/catalog/parts.sysml', attributes: {},
    };
}

const model: MemoModelDTO = {
    elements: { pump: element('pump'), tank: element('tank') },
    relationships: [],
    errors: [],
    revision: 3,
    sourceHashes: { 'model/catalog/parts.sysml': 'abc123' },
    irIdentities: {
        pump: 'file:///p/model/catalog/parts.sysml#members[0]/members[1]:PartUsage',
        tank: 'file:///p/model/catalog/parts.sysml#members[0]/members[2]:PartUsage',
    },
};

beforeEach(() => {
    sent.length = 0;
    useModelStore.setState({ model });
    // The module keeps its socket private, so the connect path is what a test
    // can reach: dial the fake, then read what the request functions queued.
    wsClient.connectWebSocket('ws://test');
});

describe('write addressing', () => {
    it('quotes the current IR identity on an element update', async () => {
        void wsClient.sendElementUpdate({ ...element('pump'), name: 'Pump A' }).catch(() => undefined);
        const update = sent.find(message => message.type === 'element:update');
        expect(update?.payload.irIdentity).toBe(model.irIdentities!.pump);
    });

    it('does not invent an identity for an element being created', async () => {
        void wsClient.sendElementCreate({ id: 'new_1', name: 'New', kind: 'SoftwareComponent' })
            .catch(() => undefined);
        const create = sent.find(message => message.type === 'element:create');
        expect(create?.payload.irIdentity).toBeUndefined();
    });

    it('quotes both endpoint identities on a relationship request', async () => {
        void wsClient.requestRelationshipCreate({
            type: 'satisfiedBy', sourceId: 'pump', targetId: 'tank', direction: 'outgoing',
        } as any).catch(() => undefined);
        const request = sent.find(message => message.type === 'relationship:create');
        expect(request?.payload.sourceIdentity).toBe(model.irIdentities!.pump);
        expect(request?.payload.targetIdentity).toBe(model.irIdentities!.tank);
    });

    it('sends no identity when the revision does not project the element', async () => {
        useModelStore.setState({ model: { ...model, irIdentities: {} } });
        void wsClient.sendElementUpdate(element('pump')).catch(() => undefined);
        const update = sent.find(message => message.type === 'element:update');
        expect(update?.payload.irIdentity).toBeUndefined();
    });
});
