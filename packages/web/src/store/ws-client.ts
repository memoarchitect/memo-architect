// ─── WebSocket Client ─────────────────────────────────────────────────────────
//
// Connects to the CLI dev server WebSocket and dispatches messages
// to the Zustand store. Auto-reconnects on disconnect.
//
// For static builds (memo build), model data is embedded in the HTML as
// window.__MEMO_DATA__. If present, we load from that instead of WebSocket.
// ─────────────────────────────────────────────────────────────────────────────

import { useModelStore } from './model-store';
import type { ServerMessage } from '@memo/core';

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
        // Auto-reconnect after 2 seconds
        reconnectTimer = setTimeout(() => connectWebSocket(url), 2000);
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
    }
}

export function requestRefresh(): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'request:refresh' }));
    }
}
