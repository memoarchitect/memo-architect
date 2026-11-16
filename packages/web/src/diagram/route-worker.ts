// ─── Routing worker ──────────────────────────────────────────────────────────
//
// Runs a planning step off the page's thread, so a large board being routed
// does not freeze the diagram that is on screen. One message in, one out.

import { planningSteps, type PlanningSteps } from './route-planning';

export interface PlanningRequest { id: number; step: keyof PlanningSteps; args: unknown[] }
export interface PlanningReply { id: number; result?: unknown; error?: string }

const scope = self as unknown as {
    onmessage: ((event: MessageEvent<PlanningRequest>) => void) | null;
    postMessage: (reply: PlanningReply) => void;
};

scope.onmessage = event => {
    const { id, step, args } = event.data;
    try {
        const run = planningSteps[step] as (...values: unknown[]) => unknown;
        scope.postMessage({ id, result: run(...args) });
    } catch (error) {
        scope.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
    }
};
