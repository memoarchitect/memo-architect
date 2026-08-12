// ─── ELK worker factory ──────────────────────────────────────────────────────
//
// ELK runs layout in a worker so a large graph does not freeze the canvas.
// The worker lives in its own module because the standalone build replaces
// this file wholesale (see `elk-worker-factory.standalone.ts`): the
// `new URL(..., import.meta.url)` below makes Vite emit `elk-worker.min.js` as
// a separate asset, and a build that must fit in one HTML file cannot have one.
// Swapping the module is what removes the emit — a dead `if` branch does not,
// because the asset is registered while the module is transformed, before any
// branch is eliminated.
// ─────────────────────────────────────────────────────────────────────────────

/** ELK's `workerFactory` option: given the worker URL it hands back the worker. */
export type ElkWorkerFactory = (url: string) => Worker;

/**
 * The factory ELK should use, or undefined to run layout in-process.
 *
 * Undefined when the runtime has no `Worker` at all, which is how the layout
 * provider ran under jsdom before this module existed.
 */
export function elkWorkerFactory(): ElkWorkerFactory | undefined {
    if (typeof Worker === 'undefined') return undefined;
    return () => new Worker(new URL('elkjs/lib/elk-worker.min.js', import.meta.url));
}
