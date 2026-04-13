// ─── WebSocket Client ─────────────────────────────────────────────────────────
//
// Connects to the CLI dev server WebSocket and dispatches messages
// to the Zustand store. Auto-reconnects on disconnect.
//
// For static builds (memo build), model data is embedded in the HTML as
// window.__MEMO_DATA__. If present, we load from that instead of WebSocket.
// ─────────────────────────────────────────────────────────────────────────────

import { useModelStore } from './model-store';
import type { ServerMessage, DiagramCreateMessage, DiagramUpdateMessage, DiagramDeleteMessage, DiagramParseMessage, DiagramLayout } from '@memo/core';

/** Embedded data injected by `memo build` */
interface EmbeddedData {
    model: any;
    validation: any;
    completeness: any;
}

declare global {
    interface Window {
        __MEMO_DATA__?: EmbeddedData;
    }
}

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 10000; // Cap at 10s

/**
 * Load embedded data if available (static build), otherwise connect WebSocket.
 */
export function loadEmbeddedData(): boolean {
    const data = window.__MEMO_DATA__;
    if (!data) return false;

    const store = useModelStore.getState();
    store.setConnected(true);
    if (data.model) store.setModel(data.model);
    if (data.validation) store.setValidation(data.validation);
    if (data.completeness) store.setCompleteness(data.completeness);
    return true;
}

export function connectWebSocket(url?: string): void {
    // If running as a static build, don't connect WebSocket
    if (window.__MEMO_DATA__) return;

    const wsUrl = url || `ws://${window.location.host}`;

    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return; // Already connected
    }

    ws = new WebSocket(wsUrl);
    const store = useModelStore.getState();

    ws.onopen = () => {
        store.setConnected(true);
        reconnectAttempts = 0;
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
    };

    ws.onmessage = (event) => {
        try {
            const msg: ServerMessage = JSON.parse(event.data);
            handleMessage(msg);
        } catch {
            // Ignore malformed messages
        }
    };

    ws.onclose = () => {
        store.setConnected(false);
        ws = null;
        // Exponential backoff: 2s, 4s, 8s, capped at 10s
        reconnectAttempts++;
        const delay = Math.min(2000 * Math.pow(2, reconnectAttempts - 1), MAX_RECONNECT_DELAY);
        reconnectTimer = setTimeout(() => connectWebSocket(url), delay);
    };

    ws.onerror = () => {
        // onclose will fire after this
    };
}

function handleMessage(msg: ServerMessage): void {
    const store = useModelStore.getState();

    switch (msg.type) {
        case 'model:update':
            store.setModel(msg.payload);
            break;
        case 'validation:update':
            store.setValidation(msg.payload);
            break;
        case 'completeness:update':
            store.setCompleteness(msg.payload);
            break;
        case 'error':
            console.error('[MEMO] Server error:', msg.payload.message);
            break;
        case 'diagram:parse:result':
            store.applyDiagramParseResult(msg.payload.diagramId, msg.payload.elementIds, msg.payload.errors);
            break;
        case 'ontology:packages':
            store.setAvailableOntologies(msg.payload.packages);
            break;
        case 'ontology:install:result':
            store.setOntologyInstallStatus({
                installing: false,
                lastInstalled: msg.payload.success ? msg.payload.packageName : undefined,
                error: msg.payload.error,
            });
            break;
        case 'ontology:remove:result':
            store.setOntologyInstallStatus({ installing: false });
            break;
        case 'diagram:layout':
            store.mergeDiagramLayouts(msg.payload.layouts);
            break;
    }
}

export function requestRefresh(): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'request:refresh' }));
    }
}

/** Send an element update to the CLI server for 2-way sync */
export function sendElementUpdate(element: any): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'element:update',
            payload: element,
        }));
    }
}

/** Send a new element creation to the CLI server */
export function sendElementCreate(element: any): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'element:create',
            payload: element,
        }));
    }
}

/** Send a new relationship request to the CLI server */
export function sendAddRelationship(sourceId: string, targetId: string, relType: string): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'relationship:add',
            payload: { sourceId, targetId, type: relType },
        }));
    }
}

/** Send a new user diagram creation to the CLI server */
export function sendDiagramCreate(payload: DiagramCreateMessage['payload']): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'diagram:create', payload }));
    }
}

/** Send a diagram update (elementIds, name, etc.) to the CLI server */
export function sendDiagramUpdate(payload: DiagramUpdateMessage['payload']): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'diagram:update', payload }));
    }
}

/** Send a diagram deletion to the CLI server */
export function sendDiagramDelete(id: string): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const payload: DiagramDeleteMessage['payload'] = { id };
        ws.send(JSON.stringify({ type: 'diagram:delete', payload }));
    }
}

/** Send a SysML snippet to the CLI server for element-ID extraction */
export function sendDiagramParse(diagramId: string, text: string): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const payload: DiagramParseMessage['payload'] = { diagramId, text };
        ws.send(JSON.stringify({ type: 'diagram:parse', payload }));
    }
}

/** Send selected ontology package names to server for persistence to memo.package.yaml */
export function sendOntologySelection(selected: string[]): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ontology:save-selection', payload: { selected } }));
    }
}

/** Send ontology install request to server */
export function sendOntologyInstall(source: string): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ontology:install', payload: { source } }));
    }
}

/** Send ontology remove request to server */
export function sendOntologyRemove(packageName: string): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ontology:remove', payload: { packageName } }));
    }
}

/** Send diagram layout update (debounced node positions/edge styles) to server for sidecar persistence */
export function sendDiagramLayoutUpdate(diagramId: string, layout: DiagramLayout): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'diagram:layout:update', payload: { diagramId, layout } }));
    }
}
