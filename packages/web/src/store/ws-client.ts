// ─── WebSocket Client ─────────────────────────────────────────────────────────
//
// Connects to the CLI dev server WebSocket and dispatches messages
// to the Zustand store. Auto-reconnects on disconnect.
//
// For static builds (memo-architect build), model data is embedded in the HTML as
// window.__MEMO_DATA__. If present, we load from that instead of WebSocket.
// ─────────────────────────────────────────────────────────────────────────────

import { useModelStore } from './model-store';
import type { DhfDoc, DhfSettings } from './model-store';
import type { ServerMessage, RestartRequiredMessage, EditConflictMessage, ModelMutationPrecondition, DiagramCreateMessage, DiagramUpdateMessage, DiagramDeleteMessage, DiagramParseMessage, DiagramLayout, CsvImportMessage, DiagramSourceResultMessage, DhfDocDTO, DhfRepoTemplateInfo, ScreenCaptureUploadResultMessage, WorkspaceRevision, ElementMutationResultMessage, MethodologySourceResultMessage } from '@memoarchitect/tools/browser';
import type {
    RelationshipCreateRequest, RelationshipCreateResultMessage,
    RelationshipDeleteRequest, RelationshipDeleteResultMessage,
    ElementDeleteResultMessage,
} from '@memoarchitect/tools/browser';
import type { ChatMessage, ProposedChange } from '@memoarchitect/tools/browser';

type ExtendedServerMessage = ServerMessage | {
    type: 'dhf:template:save:result';
    payload: { requestId: string; path?: string; error?: string };
};

/** Embedded data injected by `memo-architect build` */
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
let workspaceSessionId: string | null = null;
let workspaceRevision: number | null = null;
let awaitingWorkspaceSnapshot = false;
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
    // A conflict is an answer, not a failure: it carries the current file so
    // the caller can show both sides. Only real errors reject.
    if (payload.success || payload.conflict) pending.resolve(payload);
    else pending.reject(new Error(payload.error || `Could not ${payload.operation} diagram source.`));
}

function rejectDiagramSourceRequests(message: string): void {
    for (const pending of diagramSourceRequests.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error(message));
    }
    diagramSourceRequests.clear();
}

/** Apply a publication only if it continues the current workspace revision. */
function acceptsWorkspaceRevision(revision: WorkspaceRevision | undefined): boolean {
    // Static exports and older servers remain readable; live Tools servers
    // attach this envelope to all model/validation/completeness publications.
    if (!revision) return true;
    if (revision.snapshot) {
        workspaceSessionId = revision.workspaceSessionId;
        workspaceRevision = revision.revision;
        awaitingWorkspaceSnapshot = false;
        return true;
    }
    if (awaitingWorkspaceSnapshot) return false;
    if (workspaceSessionId !== revision.workspaceSessionId || workspaceRevision === null) {
        awaitingWorkspaceSnapshot = true;
        requestRefresh();
        return false;
    }
    // The state triplet from one rebuild all bears this revision.
    if (revision.revision === workspaceRevision) return true;
    if (revision.baseRevision === workspaceRevision && revision.revision === workspaceRevision + 1) {
        workspaceRevision = revision.revision;
        return true;
    }
    awaitingWorkspaceSnapshot = true;
    requestRefresh();
    return false;
}

// ─── Relationship authoring requests ────────────────────────────────────────

/** One in-flight relationship mutation, keyed by requestId. */
interface PendingRequest<T> {
    resolve: (payload: T) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
}

type RelationshipCreatePayload = RelationshipCreateResultMessage['payload'];
type RelationshipDeletePayload = RelationshipDeleteResultMessage['payload'];

const relationshipCreateRequests = new Map<string, PendingRequest<RelationshipCreatePayload>>();
const relationshipDeleteRequests = new Map<string, PendingRequest<RelationshipDeletePayload>>();
const elementDeleteRequests = new Map<string, PendingRequest<ElementDeleteResultMessage['payload']>>();
const elementMutationRequests = new Map<string, PendingRequest<ElementMutationResultMessage['payload']>>();
const methodologySourceRequests = new Map<string, PendingRequest<MethodologySourceResultMessage['payload']>>();
const rulePolicyWriteRequests = new Map<string, PendingRequest<any>>();
const screenCaptureUploadRequests = new Map<string, PendingRequest<ScreenCaptureUploadResultMessage['payload']>>();

/**
 * Resolve an in-flight mutation with the server's answer.
 *
 * Both outcomes resolve — a rejected relationship is a normal result the UI
 * renders as a diagnostic, not an exception. Only transport failures reject.
 */
function settleRelationshipRequest<T extends { requestId: string }>(
    payload: T,
    pending: Map<string, PendingRequest<T>>,
): void {
    const request = pending.get(payload.requestId);
    if (!request) return;
    clearTimeout(request.timer);
    pending.delete(payload.requestId);
    request.resolve(payload);
}

/** Fail every in-flight mutation, so no pending row is left waiting forever. */
function rejectRelationshipRequests(message: string): void {
    for (const map of [relationshipCreateRequests, relationshipDeleteRequests, elementDeleteRequests, screenCaptureUploadRequests]) {
        for (const pending of map.values()) {
            clearTimeout(pending.timer);
            pending.reject(new Error(message));
        }
        map.clear();
    }
    for (const pending of elementMutationRequests.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error(message));
    }
    elementMutationRequests.clear();
    for (const pending of rulePolicyWriteRequests.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error('The development server disconnected.'));
    }
    rulePolicyWriteRequests.clear();
    for (const pending of methodologySourceRequests.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error(message));
    }
    methodologySourceRequests.clear();
}

function sendRelationshipRequest<T extends { requestId: string }>(
    type: 'relationship:create' | 'relationship:delete' | 'element:delete',
    request: Record<string, unknown>,
    pending: Map<string, PendingRequest<T>>,
): Promise<T> {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error('The development server is not connected.'));
    }
    const requestId = `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            pending.delete(requestId);
            reject(new Error('The server did not answer the relationship request.'));
        }, 15000);
        pending.set(requestId, { resolve, reject, timer });
        ws!.send(JSON.stringify({ type, payload: { ...request, requestId } }));
    });
}

function sourcePrecondition(sourceFile: string, targetElementIds: string[]): ModelMutationPrecondition | undefined {
    const model = useModelStore.getState().model;
    if (!workspaceSessionId || workspaceRevision === null || !model) return undefined;
    return {
        workspaceSessionId,
        baseRevision: workspaceRevision,
        sourceFile,
        expectedSourceHash: model.sourceHashes?.[sourceFile] ?? '',
        targetElementIds,
    };
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
        workspaceSessionId = null;
        workspaceRevision = null;
        awaitingWorkspaceSnapshot = false;
        store.setRestartRequired(null);
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
    };

    ws.onmessage = (event) => {
        try {
            const msg: ExtendedServerMessage = JSON.parse(event.data);
            handleMessage(msg);
        } catch {
            // Ignore malformed messages
        }
    };

    ws.onclose = () => {
        store.setConnected(false);
        rejectDiagramSourceRequests('The development server disconnected.');
        rejectRelationshipRequests('The development server disconnected.');
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

function handleMessage(msg: ExtendedServerMessage): void {
    const store = useModelStore.getState();

    switch (msg.type) {
        case 'app:restart-required':
            restartPending = true;
            store.setRestartRequired(msg as RestartRequiredMessage);
            return;
        case 'app:edit-conflict':
            store.setEditConflict((msg as EditConflictMessage).payload);
            return;
        case 'model:update':
            if (restartPending) return; // ignore stale updates from old server
            if (!acceptsWorkspaceRevision(msg.revision)) return;
            if (msg.revision?.modelDelta && !msg.revision.snapshot && store.model) {
                const elements = { ...store.model.elements, ...msg.revision.modelDelta.upsertElements };
                for (const id of msg.revision.modelDelta.removeElementIds) delete elements[id];
                store.setModel({ ...store.model, ...msg.revision.modelDelta.patch, elements });
            } else {
                store.setModel(msg.payload);
            }
            break;
        case 'source:changed':
            if (restartPending) return;
            store.applySourceChange(msg.payload);
            break;
        case 'validation:update':
            if (restartPending) return;
            if (!acceptsWorkspaceRevision(msg.revision)) return;
            store.setValidation(msg.payload);
            break;
        case 'completeness:update':
            if (restartPending) return;
            if (!acceptsWorkspaceRevision(msg.revision)) return;
            store.setCompleteness(msg.payload);
            break;
        case 'methodology:update':
            if (restartPending) return;
            store.setMethodology(msg.payload);
            break;
        case 'rules:update':
            if (restartPending) return;
            store.setEffectiveRules(msg.payload.rules, msg.payload.diagnostics);
            break;
        case 'rule:policy:write:result':
            settleRelationshipRequest(msg.payload, rulePolicyWriteRequests);
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
        case 'relationship:create:result':
            settleRelationshipRequest(msg.payload, relationshipCreateRequests);
            break;
        case 'relationship:delete:result':
            settleRelationshipRequest(msg.payload, relationshipDeleteRequests);
            break;
        case 'element:delete:result':
            settleRelationshipRequest(msg.payload, elementDeleteRequests);
            break;
        case 'element:mutation:result':
            settleRelationshipRequest(msg.payload, elementMutationRequests);
            break;
        case 'methodology:source:result':
            settleRelationshipRequest(msg.payload, methodologySourceRequests);
            break;
        case 'screen-capture:upload:result':
            settleRelationshipRequest(msg.payload, screenCaptureUploadRequests);
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
        case 'llm:settings':
            store.setLlmSettings(msg.payload.settings);
            break;
        case 'llm:ask:result':
            if (msg.payload.error) {
                store.rejectLlmRequest(msg.payload.requestId, msg.payload.error);
            } else {
                store.resolveLlmRequest(msg.payload.requestId, msg.payload.answer);
            }
            break;
        case 'llm:chat:result':
            if (msg.payload.error) {
                store.rejectLlmRequest(msg.payload.requestId, msg.payload.error);
            } else {
                store.resolveLlmRequest(msg.payload.requestId, {
                    answer: msg.payload.answer,
                    proposedChanges: msg.payload.proposedChanges ?? [],
                    messages: msg.payload.messages ?? [],
                    truncated: msg.payload.truncated,
                });
            }
            break;
        case 'llm:chat:apply:result':
            if (msg.payload.error) {
                store.rejectLlmRequest(msg.payload.requestId, msg.payload.error);
            } else {
                store.resolveLlmRequest(msg.payload.requestId, {
                    applied: msg.payload.applied ?? [],
                    failed: msg.payload.failed ?? [],
                });
            }
            break;
        case 'llm:settings:save:result':
            if (msg.payload.error) {
                store.rejectLlmRequest(msg.payload.requestId, msg.payload.error);
            } else {
                store.resolveLlmRequest(msg.payload.requestId, msg.payload.settings);
            }
            break;
        case 'llm:generate:result':
            if (msg.payload.error) {
                store.rejectLlmRequest(msg.payload.requestId, msg.payload.error);
            } else {
                // The browser package can be older than the server during a
                // rolling upgrade. Keep this additive protocol extension
                // readable while the published tools types catch up.
                const generated = msg.payload as typeof msg.payload & {
                    initialSysml?: string; attempts?: number; diagnostics?: any[];
                    changeRecord?: { guidanceVersion: string; compiler: { id: string; version?: string } };
                };
                store.resolveLlmRequest(generated.requestId, {
                    sysml: generated.sysml,
                    initialSysml: generated.initialSysml,
                    explanation: generated.explanation,
                    suggestedFile: generated.suggestedFile,
                    attempts: generated.attempts,
                    diagnostics: generated.diagnostics ?? [],
                    changeRecord: generated.changeRecord,
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
        case 'dhf:template:save:result':
            if (msg.payload.error) {
                store.rejectLlmRequest(msg.payload.requestId, msg.payload.error);
            } else {
                store.resolveLlmRequest(msg.payload.requestId, { path: msg.payload.path });
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

/** Add a reusable project template under dhf/templates. */
export function sendDhfTemplateSave(requestId: string, title: string, content: string): void {
    sendRaw({ type: 'dhf:template:save', payload: { requestId, title, content } });
}

export type { DhfRepoTemplateInfo };

export function requestRefresh(): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'request:refresh' }));
    }
}

/** Send an element update to the CLI server for 2-way sync */
export function sendElementUpdate(element: any): Promise<ElementMutationResultMessage['payload']> {
    return sendElementMutation('element:update', element);
}

/** Send a new element creation to the CLI server */
export function sendElementCreate(element: any): Promise<ElementMutationResultMessage['payload']> {
    return sendElementMutation('element:create', element);
}

function sendElementMutation(
    type: 'element:update' | 'element:create', element: any,
): Promise<ElementMutationResultMessage['payload']> {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error('The development server is not connected.'));
    }
    const requestId = `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const model = useModelStore.getState().model;
    const sourceFile = (element.file as string | undefined) ?? 'model/catalog/project.sysml';
    const expectedSourceHash = model?.sourceHashes?.[sourceFile] ?? '';
    const precondition = workspaceSessionId && workspaceRevision !== null
        ? { workspaceSessionId, baseRevision: workspaceRevision, sourceFile, expectedSourceHash, targetElementIds: [element.id] }
        : undefined;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            elementMutationRequests.delete(requestId);
            reject(new Error('The server did not answer the element mutation.'));
        }, 15000);
        elementMutationRequests.set(requestId, { resolve, reject, timer });
        ws!.send(JSON.stringify({ type, payload: { ...element, file: sourceFile, requestId, precondition } }));
    });
}

/**
 * Ask the server to create a model relationship, and wait for its answer.
 *
 * The server revalidates the request and writes it into project SysML before
 * responding, so a resolved promise means the relationship is on disk — never
 * assume success from having sent the request.
 */
export function requestRelationshipCreate(
    request: Omit<RelationshipCreateRequest, 'requestId'>,
): Promise<RelationshipCreateResultMessage['payload']> {
    const owningFile = request.owningFile ?? 'model/catalog/relationships.sysml';
    return sendRelationshipRequest('relationship:create', {
        ...request, owningFile,
        precondition: sourcePrecondition(owningFile, [request.sourceId, request.targetId]),
    }, relationshipCreateRequests);
}

/** Ask the server to delete one relationship usage, and wait for its answer. */
export function requestRelationshipDelete(
    request: Omit<RelationshipDeleteRequest, 'requestId'>,
): Promise<RelationshipDeleteResultMessage['payload']> {
    const relationship = useModelStore.getState().model?.relationships.find(rel => rel.id === request.relationshipId);
    const sourceFile = relationship?.file ?? request.sourceFile;
    return sendRelationshipRequest('relationship:delete', {
        ...request,
        precondition: sourceFile ? sourcePrecondition(sourceFile, [relationship?.sourceId, relationship?.targetId].filter(Boolean) as string[]) : undefined,
    }, relationshipDeleteRequests);
}

/** Delete a project-owned element and every relationship connected to it. */
export function requestElementDelete(
    elementId: string,
): Promise<ElementDeleteResultMessage['payload']> {
    const element = useModelStore.getState().model?.elements[elementId];
    return sendRelationshipRequest('element:delete', {
        elementId,
        precondition: element?.file ? sourcePrecondition(element.file, [elementId]) : undefined,
    }, elementDeleteRequests);
}

/** Save a capture in model/assets/<viewName> and return its project-relative URI. */
export function requestScreenCaptureUpload(request: {
    viewName: string;
    fileName: string;
    base64: string;
    mediaType: 'image/png' | 'image/jpeg' | 'image/webp';
}): Promise<ScreenCaptureUploadResultMessage['payload']> {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error('The development server is not connected.'));
    }
    const requestId = `screen-capture-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            screenCaptureUploadRequests.delete(requestId);
            reject(new Error('The server did not answer the screen-capture upload request.'));
        }, 30000);
        screenCaptureUploadRequests.set(requestId, { resolve, reject, timer });
        ws!.send(JSON.stringify({ type: 'screen-capture:upload', payload: { ...request, requestId } }));
    });
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
    save?: { text: string; baseRevision: string },
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
            payload: { requestId, diagramId, ...(operation === 'save' ? save : {}) },
        }));
    });
}

/** Load the exact .sysml file backing a source-derived diagram. */
export function loadDiagramSource(diagramId: string): Promise<DiagramSourceResultMessage['payload']> {
    return sendDiagramSourceRequest('load', diagramId);
}

/**
 * Persist the exact .sysml file backing a source-derived diagram.
 *
 * `baseRevision` is the revision the edit started from. The server refuses the
 * write when the file has moved on since, and answers with `conflict` plus the
 * current contents — passing it is what stops a stale editor from discarding
 * someone else's work. There is no unconditional overwrite route.
 */
export function saveDiagramSource(
    diagramId: string,
    text: string,
    baseRevision: string,
): Promise<DiagramSourceResultMessage['payload']> {
    return sendDiagramSourceRequest('save', diagramId, { text, baseRevision });
}

export function methodologySource(
    operation: 'load' | 'save', sourceFile: string,
    save?: { text: string; baseRevision: string },
): Promise<MethodologySourceResultMessage['payload']> {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error('The development server is not connected.'));
    }
    const requestId = `methodology-${operation}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            methodologySourceRequests.delete(requestId);
            reject(new Error(`Timed out while trying to ${operation} methodology source.`));
        }, 15000);
        methodologySourceRequests.set(requestId, { resolve, reject, timer });
        ws!.send(JSON.stringify({
            type: `methodology:source:${operation === 'load' ? 'request' : 'save'}`,
            payload: { requestId, sourceFile, ...save },
        }));
    });
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

/**
 * Send one turn of a model conversation.
 *
 * `history` is the transcript the previous turn returned — the server keeps no
 * per-conversation state, so the client owns it.
 */
export function sendLlmChat(
    requestId: string,
    question: string,
    history: ChatMessage[],
    allowEdits: boolean,
): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'llm:chat', payload: { requestId, question, history, allowEdits } }));
    }
}

/** Apply the proposed changes the engineer approved. */
export function sendLlmApply(requestId: string, changes: ProposedChange[]): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'llm:chat:apply', payload: { requestId, changes } }));
    }
}

/** Save LLM settings. The key is written server-side, outside the project. */
export function sendLlmSettingsSave(
    requestId: string,
    payload: { provider?: string; model?: string; baseUrl?: string; apiKey?: string },
): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'llm:settings:save', payload: { requestId, ...payload } }));
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


/**
 * Ask the server to write a RulePolicy into methodology source.
 *
 * The browser sends the decision, never the SysML. Tools renders the policy and
 * writes it through the same precondition-checked path as every other mutation,
 * so a rule tailored here is subject to the same conflict handling as one typed
 * in SysIDE.
 */
export function writeRulePolicy(request: {
    targetRuleType: string;
    disposition: 'enabled' | 'disabled' | 'replaced';
    severityOverride?: 'error' | 'warning' | 'info';
    replacementRuleType?: string;
    rationaleText: string;
    authority?: string;
    approvalReference?: string;
    sourceFile: string;
    baseRevision: string;
}): Promise<{ success: boolean; error?: string; code?: string; revision?: string; conflict?: boolean }> {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error('The development server is not connected.'));
    }
    const requestId = `rule-policy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            rulePolicyWriteRequests.delete(requestId);
            reject(new Error('Timed out while writing the rule policy.'));
        }, 15000);
        rulePolicyWriteRequests.set(requestId, { resolve, reject, timer });
        ws!.send(JSON.stringify({ type: 'rule:policy:write', payload: { requestId, ...request } }));
    });
}
