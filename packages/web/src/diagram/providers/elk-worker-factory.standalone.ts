// ─── ELK worker factory — standalone build ───────────────────────────────────
//
// Aliased over `elk-worker-factory.ts` by `vite.standalone.config.ts`.
//
// A standalone viewer is opened straight off disk, and a `file://` page has a
// null origin: Chrome refuses to start a worker from it, so a worker here would
// not survive the trip even if the build could carry the extra asset. ELK's
// bundled build runs the same layout algorithms in-process, so the diagrams are
// identical — a large graph blocks the main thread while it lays out.
// ─────────────────────────────────────────────────────────────────────────────

import type { ElkWorkerFactory } from './elk-worker-factory';

export function elkWorkerFactory(): ElkWorkerFactory | undefined {
    return undefined;
}
