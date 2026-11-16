// ─── Routing worker factory ──────────────────────────────────────────────────
//
// In its own module for the reason `providers/elk-worker-factory.ts` gives: the
// `new URL(..., import.meta.url)` below makes Vite emit the worker as a separate
// asset, which the single-file standalone build cannot carry, so that build
// replaces this file with `route-worker-factory.standalone.ts`.

/** A new routing worker, or undefined where the runtime has no `Worker` (tests) and planning stays on the page. */
export function createRouteWorker(): Worker | undefined {
    if (typeof Worker === 'undefined') return undefined;
    return new Worker(new URL('./route-worker.ts', import.meta.url), { type: 'module' });
}
