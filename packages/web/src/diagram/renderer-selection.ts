// ─── Renderer feature flag ────────────────────────────────────────────────────
//
// Selection precedence (first match wins):
//   1. URL query param        ?renderer=<id or short name>   (per-tab override)
//   2. localStorage           memo.diagram.renderer          (user preference)
//   3. Vite env               VITE_MEMO_DIAGRAM_RENDERER     (deployment default)
//   4. DEFAULT_RENDERER_ID    memo.renderer.reactflow
//
// Short names are accepted everywhere: 'maxgraph' → 'memo.renderer.maxgraph'.
// Runtime switches persist to localStorage and notify subscribers so React
// surfaces re-render via useSyncExternalStore.
// ─────────────────────────────────────────────────────────────────────────────

import { DEFAULT_RENDERER_ID } from './renderer-provider';

// Versioned when restoring ReactFlow as the default renderer. Existing maxGraph
// preferences remain available as an explicit selection after this migration.
export const RENDERER_STORAGE_KEY = 'memo.diagram.renderer.v3';
export const RENDERER_QUERY_PARAM = 'renderer';
const RENDERER_ID_PREFIX = 'memo.renderer.';

const listeners = new Set<() => void>();

export function normalizeRendererId(value: string | null | undefined): string | undefined {
    const trimmed = value?.trim();
    if (!trimmed) return undefined;
    return trimmed.includes('.') ? trimmed : `${RENDERER_ID_PREFIX}${trimmed}`;
}

function fromUrl(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    try {
        return normalizeRendererId(new URLSearchParams(window.location.search).get(RENDERER_QUERY_PARAM));
    } catch {
        return undefined;
    }
}

function fromStorage(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    try {
        return normalizeRendererId(window.localStorage.getItem(RENDERER_STORAGE_KEY));
    } catch {
        return undefined; // storage disabled (private mode, sandbox)
    }
}

function fromEnv(): string | undefined {
    try {
        const env = (import.meta as { env?: Record<string, string | undefined> }).env;
        return normalizeRendererId(env?.VITE_MEMO_DIAGRAM_RENDERER);
    } catch {
        return undefined;
    }
}

/** Resolve the active renderer id from flag sources; does not validate registration. */
export function selectedRendererId(): string {
    return fromUrl() ?? fromStorage() ?? fromEnv() ?? DEFAULT_RENDERER_ID;
}

/** Persist a user renderer choice and notify subscribers. */
export function setSelectedRendererId(id: string): void {
    const normalized = normalizeRendererId(id) ?? DEFAULT_RENDERER_ID;
    try {
        window.localStorage.setItem(RENDERER_STORAGE_KEY, normalized);
    } catch {
        // storage disabled — selection still applies for this session via listeners
    }
    // A URL override would silently win over the user's explicit pick; drop it.
    try {
        const url = new URL(window.location.href);
        if (url.searchParams.has(RENDERER_QUERY_PARAM)) {
            url.searchParams.delete(RENDERER_QUERY_PARAM);
            window.history.replaceState(window.history.state, '', url);
        }
    } catch {
        // non-browser environment
    }
    for (const listener of [...listeners]) listener();
}

/** useSyncExternalStore subscription for renderer flag changes. */
export function subscribeRendererSelection(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
