// ─── A planning step gives the same answer wherever it runs ─────────────────
//
// `planOffThread` hands a step to the routing worker when there is one. These
// tests hold it to the contract that makes that safe: with no worker the step
// runs on the page, and a worker that fails or cannot take the arguments is
// answered on the page too, with the answer the step itself gives.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeOrthogonalEdges, type OrthogonalRouteRequest, type RouteObstacle } from '../../views/orthogonal-router';

const obstacles: RouteObstacle[] = [
    { id: 'sender', x: 0, y: 0, width: 200, height: 120 },
    { id: 'receiver', x: 500, y: 300, width: 200, height: 120 },
];
const requests: OrthogonalRouteRequest[] = [{
    id: 'link', sourceNodeId: 'sender', targetNodeId: 'receiver',
    source: { x: 200, y: 60 }, target: { x: 500, y: 360 }, sourceSide: 'right', targetSide: 'left',
}];
const expected = () => routeOrthogonalEdges(requests, obstacles);

/** A fresh copy of the module, so each test starts with no worker chosen. */
async function load(createRouteWorker: () => Worker | undefined) {
    vi.resetModules();
    vi.doMock('../route-worker-factory', () => ({ createRouteWorker }));
    return (await import('../route-off-thread')).planOffThread;
}

afterEach(() => vi.doUnmock('../route-worker-factory'));

describe('planning off the page', () => {
    it('runs the step on the page when there is no worker', async () => {
        const planOffThread = await load(() => undefined);
        expect(await planOffThread('route', requests, obstacles)).toEqual(expected());
    });

    it('takes the answer the worker posts back', async () => {
        const worker = {
            onmessage: null as ((event: { data: unknown }) => void) | null,
            postMessage(message: { id: number }) {
                queueMicrotask(() => this.onmessage?.({ data: { id: message.id, result: new Map([['link', []]]) } }));
            },
            terminate() {},
        };
        const planOffThread = await load(() => worker as unknown as Worker);
        expect(await planOffThread('route', requests, obstacles)).toEqual(new Map([['link', []]]));
    });

    it('answers on the page when the worker fails, then stops using it', async () => {
        const created = vi.fn();
        const worker = {
            onerror: null as (() => void) | null,
            postMessage() { queueMicrotask(() => this.onerror?.()); },
            terminate: vi.fn(),
        };
        const planOffThread = await load(() => { created(); return worker as unknown as Worker; });
        expect(await planOffThread('route', requests, obstacles)).toEqual(expected());
        expect(await planOffThread('route', requests, obstacles)).toEqual(expected());
        expect(created).toHaveBeenCalledTimes(1);
        expect(worker.terminate).toHaveBeenCalled();
    });

    it('answers on the page when the worker reports an error for the step', async () => {
        const worker = {
            onmessage: null as ((event: { data: unknown }) => void) | null,
            postMessage(message: { id: number }) {
                queueMicrotask(() => this.onmessage?.({ data: { id: message.id, error: 'failed' } }));
            },
            terminate() {},
        };
        const planOffThread = await load(() => worker as unknown as Worker);
        expect(await planOffThread('route', requests, obstacles)).toEqual(expected());
    });
});
