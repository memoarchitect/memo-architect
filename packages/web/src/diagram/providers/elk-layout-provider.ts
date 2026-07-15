import ELKConstructor, { type ELK } from 'elkjs/lib/elk.bundled.js';
import type { LayoutExecutionContext, LayoutGraph, LayoutProvider } from '../layout-provider';

const DEFAULT_TIMEOUT_MS = 5_000;

export class ElkLayoutProvider implements LayoutProvider {
    readonly descriptor = {
        id: 'memo.layout.elk',
        name: 'ELK',
        version: '0.9.3',
        contractVersion: '1' as const,
        license: 'EPL-2.0',
        description: 'Layered and hierarchical engineering layouts with ports and orthogonal routes.',
        mode: 'automatic' as const,
        capabilities: [
            'flat-graph', 'compound-graph', 'explicit-ports', 'orthogonal-routes',
            'fixed-nodes', 'deterministic', 'cancellable', 'worker-runtime',
        ] as const,
    };

    private instance: ELK | undefined;
    private chain: Promise<unknown> = Promise.resolve();

    supports(): { supported: true } {
        return { supported: true };
    }

    layout(graph: Readonly<LayoutGraph>, context: LayoutExecutionContext = {}): Promise<LayoutGraph> {
        const job = () => this.runBounded(graph, context);
        const result = this.chain.then(job, job);
        this.chain = result.then(() => undefined, () => undefined);
        return result;
    }

    dispose(): void {
        this.reset();
    }

    private getInstance(): ELK {
        if (!this.instance) {
            this.instance = typeof Worker === 'undefined'
                ? new ELKConstructor()
                : new ELKConstructor({
                    workerFactory: (_url: string) => new Worker(
                        new URL('elkjs/lib/elk-worker.min.js', import.meta.url),
                    ),
                } as never);
        }
        return this.instance;
    }

    private reset(): void {
        try {
            (this.instance as unknown as { terminateWorker?: () => void })?.terminateWorker?.();
        } catch {
            // A failed worker is replaced on the next request.
        }
        this.instance = undefined;
    }

    private runBounded(graph: Readonly<LayoutGraph>, context: LayoutExecutionContext): Promise<LayoutGraph> {
        return new Promise((resolve, reject) => {
            let settled = false;
            const finish = (fn: () => void) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                context.signal?.removeEventListener('abort', onAbort);
                fn();
            };
            const onAbort = () => finish(() => {
                // Terminate the still-running job before the serialized queue advances.
                this.reset();
                reject(context.signal?.reason ?? new DOMException('Layout aborted', 'AbortError'));
            });
            const timeoutMs = context.timeoutMs ?? DEFAULT_TIMEOUT_MS;
            const timer = setTimeout(() => finish(() => {
                this.reset();
                reject(new Error(`ELK layout timed out after ${timeoutMs / 1000}s`));
            }), timeoutMs);

            context.signal?.addEventListener('abort', onAbort, { once: true });
            if (context.signal?.aborted) return onAbort();

            this.getInstance().layout(graph as Parameters<ELK['layout']>[0]).then(
                value => finish(() => resolve(value as LayoutGraph)),
                error => finish(() => reject(error)),
            );
        });
    }
}
