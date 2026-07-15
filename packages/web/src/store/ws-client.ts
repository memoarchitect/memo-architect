// ─── WebSocket Client ─────────────────────────────────────────────────────────
//
// Connects to the CLI dev server WebSocket and dispatches messages
// to the Zustand store. Auto-reconnects on disconnect.
//
// For static builds (memo build), model data is embedded in the HTML as
// window.__MEMO_DATA__. If present, we load from that instead of WebSocket.
// ─────────────────────────────────────────────────────────────────────────────

import { useModelStore } from './model-store';
import type { DhfDoc, DhfSettings } from './model-store';
import type { ServerMessage, RestartRequiredMessage, DiagramCreateMessage, DiagramUpdateMessage, DiagramDeleteMessage, DiagramParseMessage, DiagramLayout, CsvImportMessage, DiagramSourceResultMessage, DhfDocDTO, DhfRepoTemplateInfo } from '@memo/core';

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
const MAX_RECONNECT_DELAY = 10000;
/** Block model updates after restart-required until the page reloads */
let restartPending = false;
/** Ontology hash received from the first ontology:packages message this session */
let currentOntologyHash: string | null = null;
const diagramSourceRequests = new Map<string, {
    resolve: (payload: DiagramSourceResultMessage['payload']) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
}>();

function settleDiagramSourceRequest(payload: DiagramSourceResultMessage['payload']): void {
    const pending = diagramSourceRequests.get(payload.requestId);
    if (!pending) return;
    clearTimeout(pending.timer);
    diagramSourceRequests.delete(payload.requestId);
    if (payload.success) pending.resolve(payload);
    else pending.reject(new Error(payload.error || `Could not ${payload.operation} diagram source.`));
}

function rejectDiagramSourceRequests(message: string): void {
    for (const pending of diagramSourceRequests.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error(message));
    }
    diagramSourceRequests.clear();
}

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

    installDhfPersistence();

    const wsUrl = url || `ws://${window.location.host}`;

    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return; // Already connected
    }

    ws = new WebSocket(wsUrl);
    const store = useModelStore.getState();

    ws.onopen = () => {
        store.setConnected(true);
        reconnectAttempts = 0;
        currentOntologyHash = null; // reset on each fresh connection
        restartPending = false;
        store.setRestartRequired(null);
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
        rejectDiagramSourceRequests('The development server disconnected.');
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
        case 'app:restart-required':
            restartPending = true;
            store.setRestartRequired(msg as RestartRequiredMessage);
            return;
        case 'model:update':
            if (restartPending) return; // ignore stale updates from old server
            store.setModel(msg.payload);
            break;
        case 'validation:update':
            if (restartPending) return;
            store.setValidation(msg.payload);
            break;
        case 'completeness:update':
            if (restartPending) return;
            store.setCompleteness(msg.payload);
            break;
        case 'methodology:update':
            if (restartPending) return;
            store.setMethodology(msg.payload);
            break;
        case 'error':
            console.error('[MEMO] Server error:', msg.payload.message);
            break;
        case 'diagram:parse:result':
            store.applyDiagramParseResult(msg.payload.diagramId, msg.payload.elementIds, msg.payload.errors);
            break;
        case 'diagram:source:result':
            settleDiagramSourceRequest(msg.payload);
            break;
        case 'ontology:packages': {
            const hash = (msg.payload as any).ontologyHash as string | undefined;
            if (hash) {
                if (currentOntologyHash === null) {
                    currentOntologyHash = hash;
                } else if (currentOntologyHash !== hash) {
                    // Hash mismatch — stale server messages after a restart race
                    restartPending = true;
                    store.setRestartRequired({
                        type: 'app:restart-required',
                        reason: 'ontology-source-changed',
                        changedFile: '(server restarted with different ontology)',
                        instruction: 'Reload the page to connect to the new server.',
                    } as RestartRequiredMessage);
                    return;
                }
            }
            store.setAvailableOntologies(msg.payload.packages);
            break;
        }
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
        case 'import:result':
            store.setImportResult(msg.payload);
            break;
        case 'llm:status':
            store.setLlmStatus(msg.payload.available, msg.payload.provider, msg.payload.model);
            break;
        case 'llm:ask:result':
            if (msg.payload.error) {
                store.rejectLlmRequest(msg.payload.requestId, msg.payload.error);
            } else {
                store.resolveLlmRequest(msg.payload.requestId, msg.payload.answer);
            }
            break;
        case 'llm:generate:result':
            if (msg.payload.error) {
                store.rejectLlmRequest(msg.payload.requestId, msg.payload.error);
            } else {
                store.resolveLlmRequest(msg.payload.requestId, {
                    sysml: msg.payload.sysml,
                    explanation: msg.payload.explanation,
                    suggestedFile: msg.payload.suggestedFile,
                });
            }
            break;
        case 'llm:draft:result':
            if (msg.payload.error) {
                store.rejectLlmRequest(msg.payload.requestId, msg.payload.error);
            } else {
                store.resolveLlmRequest(msg.payload.requestId, {
                    markdown: msg.payload.markdown,
                    summary: msg.payload.summary,
                });
            }
            break;
        case 'llm:suggest:result':
            if (msg.payload.error) {
                store.rejectLlmRequest(msg.payload.requestId, msg.payload.error);
            } else {
                store.resolveLlmRequest(msg.payload.requestId, msg.payload.suggestions);
            }
            break;
        case 'dhf:docs':
            applyServerDhfSnapshot(() => store.setDhfDocuments(msg.payload.docs as DhfDoc[]));
            break;
        case 'dhf:settings':
            applyServerDhfSnapshot(() => store.hydrateDhfSettings(msg.payload.settings as Partial<DhfSettings>));
            break;
        case 'dhf:templates:result':
            store.resolveLlmRequest(msg.payload.requestId, msg.payload.templates);
            break;
        case 'dhf:template:content':
            if (msg.payload.error) {
                store.rejectLlmRequest(msg.payload.requestId, msg.payload.error);
            } else {
                store.resolveLlmRequest(msg.payload.requestId, msg.payload.content);
            }
            break;
    }
}

// ─── DHF persistence ─────────────────────────────────────────────────────────
//
// All DHF document/settings edits flow through the store; a subscription here
// diffs each state change and persists it to the dev server, so every UI call
// site (create, edit, delete, settings) is covered without extra plumbing.
// Server snapshots are applied under a flag so they are not echoed back.

let applyingServerSnapshot = false;
const DHF_SAVE_DEBOUNCE_MS = 600;
const pendingDocSaves = new Map<string, ReturnType<typeof setTimeout>>();
let pendingSettingsSave: ReturnType<typeof setTimeout> | null = null;

function applyServerDhfSnapshot(apply: () => void): void {
    applyingServerSnapshot = true;
    try { apply(); } finally { applyingServerSnapshot = false; }
}

function sendRaw(message: unknown): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

function scheduleDocSave(doc: DhfDoc): void {
    const prev = pendingDocSaves.get(doc.id);
    if (prev) clearTimeout(prev);
    pendingDocSaves.set(doc.id, setTimeout(() => {
        pendingDocSaves.delete(doc.id);
        const current = useModelStore.getState().dhfDocuments.find(d => d.id === doc.id);
        if (current) sendRaw({ type: 'dhf:doc:save', payload: { doc: current as DhfDocDTO } });
    }, DHF_SAVE_DEBOUNCE_MS));
}

// model-store imports this module (send helpers), so the subscription cannot
// run at module init — the store may not exist yet in the cycle. It is
// installed on the first connectWebSocket() call instead.
let dhfPersistenceInstalled = false;
function installDhfPersistence(): void {
    if (dhfPersistenceInstalled) return;
    dhfPersistenceInstalled = true;
    useModelStore.subscribe((state, prevState) => {
    if (applyingServerSnapshot) return;

    if (state.dhfDocuments !== prevState.dhfDocuments) {
        const prevById = new Map(prevState.dhfDocuments.map(d => [d.id, d]));
        for (const doc of state.dhfDocuments) {
            if (prevById.get(doc.id) !== doc) scheduleDocSave(doc);
            prevById.delete(doc.id);
        }
        for (const removedId of prevById.keys()) {
            const timer = pendingDocSaves.get(removedId);
            if (timer) { clearTimeout(timer); pendingDocSaves.delete(removedId); }
            sendRaw({ type: 'dhf:doc:delete', payload: { docId: removedId } });
        }
    }

    if (state.dhfSettings !== prevState.dhfSettings) {
        if (pendingSettingsSave) clearTimeout(pendingSettingsSave);
        pendingSettingsSave = setTimeout(() => {
            pendingSettingsSave = null;
            sendRaw({ type: 'dhf:settings:save', payload: { settings: useModelStore.getState().dhfSettings } });
        }, DHF_SAVE_DEBOUNCE_MS);
    }
    });
}

/** Request the repo's markdown files usable as custom templates */
export function sendDhfTemplatesList(requestId: string): void {
    sendRaw({ type: 'dhf:templates:list', payload: { requestId } });
}

/** Request the content of one repo template file */
export function sendDhfTemplateRead(requestId: string, path: string): void {
    sendRaw({ type: 'dhf:template:read', payload: { requestId, path } });
}

export type { DhfRepoTemplateInfo };

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

function sendDiagramSourceRequest(
    operation: 'load' | 'save',
    diagramId: string,
    text?: string,
): Promise<DiagramSourceResultMessage['payload']> {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error('The development server is not connected.'));
    }
    const requestId = `diagram-source-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            diagramSourceRequests.delete(requestId);
            reject(new Error(`Timed out while trying to ${operation} the SysML source.`));
        }, 10000);
        diagramSourceRequests.set(requestId, { resolve, reject, timer });
        ws!.send(JSON.stringify({
            type: operation === 'load' ? 'diagram:source:request' : 'diagram:source:save',
            payload: { requestId, diagramId, ...(operation === 'save' ? { text } : {}) },
        }));
    });
}

/** Load the exact .sysml file backing a source-derived diagram. */
export function loadDiagramSource(diagramId: string): Promise<DiagramSourceResultMessage['payload']> {
    return sendDiagramSourceRequest('load', diagramId);
}

/** Persist the exact .sysml file backing a source-derived diagram. */
export function saveDiagramSource(diagramId: string, text: string): Promise<DiagramSourceResultMessage['payload']> {
    return sendDiagramSourceRequest('save', diagramId, text);
}

/** Send kind remapping to server — replaces orphaned kind references in SysML files */
export function sendKindRemap(mappings: Record<string, string>): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'element:remap-kinds', payload: { mappings } }));
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

/**
 * Ask the CLI dev server to open a source file in the user's editor (N-ONTO §6.5).
 * Server-side handler resolves the path relative to the project root and invokes
 * the system-default opener. No-op if the WebSocket is not connected.
 */
export function sendOpenFile(path: string): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'open-file', payload: { path } }));
    }
}

/** Send ontology remove request to server */
export function sendOntologyRemove(packageName: string): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ontology:remove', payload: { packageName } }));
    }
}

/** Save per-diagram positions/edge styles to the view's .viewlayout companion. */
export function sendDiagramLayoutUpdate(diagramId: string, layout: DiagramLayout): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'diagram:layout:update', payload: { diagramId, layout } }));
    }
}

/** Send a bulk CSV import request to the CLI server */
export function sendCsvImport(payload: CsvImportMessage['payload']): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'csv:import', payload }));
    }
}

/** Send a model Q&A question to the LLM via the CLI server */
export function sendLlmAsk(requestId: string, question: string): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'llm:ask', payload: { requestId, question } }));
    }
}

/** Send a SysML generation request to the LLM via the CLI server */
export function sendLlmGenerate(requestId: string, description: string): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'llm:generate', payload: { requestId, description } }));
    }
}

/** Send a DHF section draft request to the LLM via the CLI server */
export function sendLlmDraft(requestId: string, documentTypeId: string, targetSections?: string[]): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'llm:draft', payload: { requestId, documentTypeId, targetSections } }));
    }
}

/** Send a completeness suggestion request to the LLM via the CLI server */
export function sendLlmSuggest(requestId: string): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'llm:suggest', payload: { requestId } }));
    }
}
