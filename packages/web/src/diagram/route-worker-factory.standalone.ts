// ─── Routing worker factory, standalone build ────────────────────────────────
//
// Aliased over `route-worker-factory.ts` by `vite.standalone.config.ts`. A
// single HTML file has no second file to load a worker from, so planning runs
// on the page there.

export function createRouteWorker(): Worker | undefined {
    return undefined;
}
