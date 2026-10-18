import type { DiagramLayout } from '@memoarchitect/tools/browser';

// Wire JSON is the boundary: native graph instances never enter this tracker.
function key(value: unknown): string {
    if (Array.isArray(value)) return '[' + value.map(key).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.entries(value)
        .filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ':' + key(v)).join(',') + '}';
    return JSON.stringify(value);
}

/** Connection-local protection, not a multi-client revision/conflict protocol. */
export class LayoutSaveObservation {
    private sequence = 0;
    private received = new Map<string, string>();
    private entries = new Map<string, { requestId: string; status: 'pending' | 'saved' | 'failed';
        error?: string; latest: string; older: string[] }>();
    sent(diagramId: string, layout: DiagramLayout): string {
        const old = this.entries.get(diagramId);
        const requestId = 'layout-' + ++this.sequence;
        this.entries.set(diagramId, { requestId, status: 'pending', latest: key(layout),
            older: old ? [...old.older, old.latest].slice(-32) : this.received.has(diagramId) ? [this.received.get(diagramId)!] : [] });
        return requestId;
    }
    observed(diagramId: string, requestId: string, error?: string): boolean {
        const entry = this.entries.get(diagramId);
        if (!entry || entry.requestId !== requestId) return false;
        entry.status = error ? 'failed' : 'saved';
        entry.error = error;
        return true;
    }
    read(diagramId: string) {
        const entry = this.entries.get(diagramId);
        return entry ? { requestId: entry.requestId, status: entry.status, error: entry.error } : undefined;
    }
    accept(diagramId: string, layout: DiagramLayout): boolean {
        const entry = this.entries.get(diagramId);
        const incoming = key(layout);
        if (!entry) { this.received.set(diagramId, incoming); return true; }
        if (incoming === entry.latest) return true;
        return entry.status === 'saved' && !entry.older.includes(incoming);
    }
}
