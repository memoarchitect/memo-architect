// ─── Planning off the page's thread ──────────────────────────────────────────
//
// `planOffThread('route', …)` gives the same answer as calling the step, from
// the routing worker when there is one. The page stays responsive while a
// large board is planned, and keeps drawing what it had. Without a worker, or
// if the worker fails, the step runs on the page: slower to look at, never
// wrong.

import { planningSteps, type PlanningSteps } from './route-planning';
import { createRouteWorker } from './route-worker-factory';
import type { PlanningReply, PlanningRequest } from './route-worker';

type Waiting = { resolve: (value: unknown) => void; run: () => unknown };

let worker: Worker | undefined | null;
let nextId = 0;
const waiting = new Map<number, Waiting>();

/** Everything still waiting is answered on the page, and so is everything asked from now on. */
function giveUpOnWorker(): void {
    worker?.terminate();
    worker = null;
    for (const [id, { resolve, run }] of [...waiting]) {
        waiting.delete(id);
        resolve(run());
    }
}

function routeWorker(): Worker | undefined {
    if (worker === null) return undefined;
    if (worker) return worker;
    try {
        worker = createRouteWorker() ?? null;
    } catch {
        worker = null;
    }
    if (!worker) return undefined;
    worker.onmessage = (event: MessageEvent<PlanningReply>) => {
        const { id, result, error } = event.data;
        const asked = waiting.get(id);
        if (!asked) return;
        waiting.delete(id);
        asked.resolve(error === undefined ? result : asked.run());
    };
    worker.onerror = giveUpOnWorker;
    worker.onmessageerror = giveUpOnWorker;
    return worker;
}

/** The answer of a planning step, computed off the page's thread where that is possible. */
export function planOffThread<Step extends keyof PlanningSteps>(
    step: Step, ...args: Parameters<PlanningSteps[Step]>
): Promise<ReturnType<PlanningSteps[Step]>> {
    const run = () => (planningSteps[step] as (...values: unknown[]) => unknown)(...args);
    const target = routeWorker();
    return new Promise(resolve => {
        const settle = resolve as (value: unknown) => void;
        if (!target) { settle(run()); return; }
        const id = ++nextId;
        waiting.set(id, { resolve: settle, run });
        try {
            target.postMessage({ id, step, args } satisfies PlanningRequest);
        } catch {
            // An argument that cannot be copied to the worker: this one is answered here.
            waiting.delete(id);
            settle(run());
        }
    });
}
