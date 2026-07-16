// ─── Model Store (Zustand) ────────────────────────────────────────────────────
//
// Central state for the web app. Receives model, validation, and completeness
// updates from the CLI dev server via WebSocket.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import type {
    MemoModelDTO,
    MemoElement,
    MemoRelationship,
    DiagramDTO,
    DiagramLayout,
    RestartRequiredMessage,
} from '@memo/tools/browser';
import type { ValidationResult, CompletenessReport } from '@memo/tools/browser';
import { sendElementUpdate, sendElementCreate, sendDiagramCreate, sendDiagramUpdate, sendDiagramDelete } from './ws-client';
import type { OntologyPackageInfo, OntologySaveResult, OrphanedElement } from '../types/ontology';
import type { ViewpointDTO } from '@memo/tools/browser';

const USER_VPS_KEY = 'memo:userViewpoints';
const ACTIVE_VIEW_KEY = 'memo:activeView';

/** Restore only stable, project-addressable navigation across browser reloads. */
function restoreActiveView(): ActiveView {
    try {
        const value = JSON.parse(sessionStorage.getItem(ACTIVE_VIEW_KEY) ?? 'null') as ActiveView | null;
        if (value?.type === 'diagram' && typeof value.diagramId === 'string') return value;
    } catch { /* unavailable storage or stale value */ }
    return { type: 'welcome' };
}

export function persistActiveView(view: ActiveView): void {
    try {
        if (view.type === 'diagram') sessionStorage.setItem(ACTIVE_VIEW_KEY, JSON.stringify(view));
        else sessionStorage.removeItem(ACTIVE_VIEW_KEY);
    } catch { /* unavailable storage */ }
}

/** One-time migration: read any legacy localStorage viewpoints and wipe the key. */
function migrateLegacyViewpoints(): ViewpointDTO[] {
    try {
        const raw = localStorage.getItem(USER_VPS_KEY);
        if (raw) {
            const vps = JSON.parse(raw) as ViewpointDTO[];
            localStorage.removeItem(USER_VPS_KEY);
            if (vps.length > 0) {
                console.warn(
                    `[MEMO] Migrated ${vps.length} user viewpoint(s) from localStorage. ` +
                    'Save them to memo.viewpoints.yaml to persist across sessions.'
                );
            }
            return vps;
        }
    } catch { /* ignore */ }
    return [];
}

export const FOLDER_ATTR = '_folder';

/** Primary navigation modes — mirrors the top-nav in ModeSwitcher. */
export type AppMode = 'dashboard' | 'catalog' | 'diagram' | 'scenario' | 'ontology' | 'dsm' | 'dhf' | 'import';

/** Active view in the unified canvas */
export type ActiveView =
    | { type: 'diagram'; diagramId: string }
    | { type: 'element-detail'; elementId: string }
    | { type: 'dsm' }
    | { type: 'ontology' }
    | { type: 'ontology-detail'; packageName: string; layerId?: string }
    | { type: 'traceability' }
    | { type: 'tabular'; viewpointId?: string; diagramId?: string }  // #14: element spreadsheet
    | { type: 'scenario-editor' }
    | { type: 'model-diff' }
    | { type: 'compliance-wizard' }
    | { type: 'statistics' }
    | { type: 'dhf-dashboard' }
    | { type: 'dhf-document'; docId: string }
    | { type: 'dhf-dashboard-legacy' }   // legacy grid view
    | { type: 'ask' }                    // E: model Q&A (#52)
    | { type: 'sysml-generator' }        // E: NL → SysML (#54)
    | { type: 'dashboard' }           // N1: home dashboard (replaces welcome after model loads)
    | { type: 'review-dashboard' }    // N1: first-review "money shot" view (#132)
    | { type: 'workflow-wizard' }     // N1: guided multi-step workflow panel (#40)
    | { type: 'import' }
    | { type: 'welcome' };

/** A DHF document created by the user in the DHF Workbench */
export interface DhfDoc {
    id: string;         // e.g. "RMP-001"
    title: string;
    group: string;      // e.g. "Risk Management"
    templateId: string; // e.g. "iso-14971/rmp"
    content: string;
    createdAt: number;
    // Per-document authors / approvers (one "Name | Role" entry per line)
    authors: string;
    approvers: string;
}

/**
 * Global DHF settings — project metadata, look & feel, and export config.
 * Values resolve {{project.*}} directives in templates.
 */
export interface DhfSettings {
    // Project identity
    company: string;
    product: string;
    deviceType: string;
    version: string;
    phase: 'concept' | 'design' | 'verification' | 'production' | '';
    // Branding
    logoUrl: string;          // URL or data URI for full logo
    compactLogoUrl: string;   // URL or data URI for compact/icon logo
    primaryColor: string;     // Hex color used in headers/badges
    // Document layout
    compactMode: boolean;     // Tighter line spacing & smaller headings
    headerTemplate: string;   // Markdown template for page header ({{title}}, {{id}}, etc.)
    footerTemplate: string;   // Markdown template for page footer
    // Numbering
    documentNumberingPrefix: string; // e.g. "DOC" → "DOC-RMP-001"
}

/** Which explorer tab is active in the left panel */
export type ExplorerTab = 'model' | 'views' | 'worksets' | 'ontologies';

/** Generic analysis issue surfaced by tools (DSM, traceability, etc.) */
export interface AnalysisIssue {
    id: string;
    source: string;        // e.g. 'DSM'
    severity: 'warning' | 'info';
    elementId: string;
    elementName: string;
    message: string;
    tag?: string;          // short label, e.g. 'unallocated'
}

export type GroupBy = 'layer' | 'kind' | 'construct' | 'source';
export type CatalogGroupBy = 'semantic';  // V-Cycle is the only sensible top-level grouping

export interface ContextMenuState {
    x: number;
    y: number;
    elementId?: string;
    folderId?: string;
    kind?: string;
    type: 'element' | 'folder' | 'kind' | 'group';
}

export interface ModelState {
    // ─── Data ─────────────────────────────────────────────────────────────
    model: MemoModelDTO | null;
    validation: ValidationResult | null;
    completeness: CompletenessReport | null;
    connected: boolean;
    restartRequired: RestartRequiredMessage | null;
    methodology: import('@memo/tools/browser').MethodologyDescriptor | null;

    // ─── UI State ─────────────────────────────────────────────────────────
    activeMode: AppMode;
    activeView: ActiveView;
    explorerTab: ExplorerTab;
    selectedElementId: string | null;
    selectedRelationshipId: string | null;
    selectedElementIds: Set<string>;
    recentlyVisited: string[];
    selectedViewpointId: string | null;
    selectedDiagramId: string | null;
    searchTerm: string;
    sidebarCollapsed: boolean;
    propertiesPanelCollapsed: boolean;
    hiddenLayers: Set<string>;
    ontologyGroupBy: GroupBy;
    collapsedGroups: Set<string>;

    // ─── Ontology selection state (Phase C2) ──────────────────────────────────
    availableOntologies: OntologyPackageInfo[];
    selectedOntologies: Set<string>;        // package names currently selected
    focusedOntologyId: string | null;       // package name shown in detail panel
    selectedOntologyKind: string | null;    // bidirectional selection sync (issues 4+8)
    ontologyViewMode: 'visual' | 'table';   // LayerGrid vs LayerTable
    showOntologyRelationships: boolean;     // collapsible relationships section
    highlightedRelationshipType: string | null; // highlighted rel type in detail
    hiddenEdgeTypes: Set<string>;           // edge type ids hidden in the ontology decomposition diagram
    ontologyInstallStatus: { installing: boolean; lastInstalled?: string; error?: string };

    // Gap bar
    gapBarExpanded: boolean;
    gapBarHeight: number;

    // ─── Catalog State ────────────────────────────────────────────────────
    catalogGroupBy: CatalogGroupBy;
    catalogCollapsed: Set<string>;
    contextMenu: ContextMenuState | null;
    attributeFilter: { key: string; value: string } | null;
    labelFilter: string | null;
    tagFilters: string[];  // active tag filters (AND logic)

    // ─── Sidecar layouts (per diagramId) ─────────────────────────────
    diagramLayouts: Record<string, DiagramLayout>;
    mergeDiagramLayouts: (layouts: Record<string, DiagramLayout>) => void;
    setNodeLayout: (diagramId: string, nodeId: string, pos: { x: number; y: number; width?: number; height?: number; color?: string }) => void;

    // ─── Diagram parse errors (per diagramId) ─────────────────────────
    diagramParseErrors: Record<string, string[]>;

    // ─── Analysis issues (from tools: DSM, traceability, etc.) ───────────
    analysisIssues: AnalysisIssue[];
    setAnalysisIssues: (issues: AnalysisIssue[]) => void;

    // ─── Editing ──────────────────────────────────────────────────────────
    editingElementId: string | null;
    pendingEdits: Map<string, Partial<{ doc: string; attributes: Record<string, string> }>>;

    // ─── Actions ──────────────────────────────────────────────────────────
    setModel: (model: MemoModelDTO) => void;
    setValidation: (validation: ValidationResult) => void;
    setCompleteness: (completeness: CompletenessReport) => void;
    setConnected: (connected: boolean) => void;
    setRestartRequired: (msg: RestartRequiredMessage | null) => void;
    setMethodology: (m: import('@memo/tools/browser').MethodologyDescriptor | null) => void;
    setActiveMode: (mode: AppMode) => void;
    setActiveView: (view: ActiveView) => void;
    setExplorerTab: (tab: ExplorerTab) => void;
    selectElement: (id: string | null) => void;
    inspectElement: (id: string | null) => void;
    inspectRelationship: (id: string | null) => void;
    toggleElementSelection: (id: string) => void;
    selectAllElements: (ids: string[]) => void;
    clearElementSelection: () => void;
    updateElementKind: (elementId: string, newKind: string) => void;
    bulkUpdateAttributes: (elementIds: string[], attributes: Record<string, string>) => void;
    selectViewpoint: (id: string | null) => void;
    selectDiagram: (id: string | null) => void;
    setSearchTerm: (term: string) => void;
    toggleSidebar: () => void;
    togglePropertiesPanel: () => void;
    toggleLayerVisibility: (layer: string) => void;
    setOntologyGroupBy: (groupBy: GroupBy) => void;
    toggleGroupCollapsed: (groupId: string) => void;

    // ─── Ontology selection actions (Phase C2) ────────────────────────────────
    setAvailableOntologies: (ontologies: OntologyPackageInfo[]) => void;
    toggleOntologySelection: (packageName: string) => void;
    setFocusedOntology: (packageName: string | null) => void;
    setSelectedOntologyKind: (kind: string | null) => void;
    setOntologyViewMode: (mode: 'visual' | 'table') => void;
    toggleOntologyRelationships: () => void;
    setHighlightedRelationshipType: (type: string | null) => void;
    toggleHiddenEdgeType: (type: string) => void;
    saveOntologySelection: () => OntologySaveResult;
    setOntologyInstallStatus: (status: { installing: boolean; lastInstalled?: string; error?: string }) => void;

    // Gap bar actions
    toggleGapBar: () => void;
    setGapBarHeight: (height: number) => void;

    // Catalog actions
    setCatalogGroupBy: (groupBy: CatalogGroupBy) => void;
    toggleCatalogCollapsed: (groupId: string) => void;
    setCatalogCollapsedAll: (collapsed: boolean) => void;
    setContextMenu: (menu: ContextMenuState | null) => void;
    setAttributeFilter: (filter: { key: string; value: string } | null) => void;
    setLabelFilter: (label: string | null) => void;
    toggleTagFilter: (tag: string) => void;
    clearTagFilters: () => void;

    // Editing actions
    setEditingElement: (id: string | null) => void;
    updateElementField: (elementId: string, field: 'doc', value: string) => void;
    updateElementAttribute: (elementId: string, key: string, value: string) => void;
    updateElementFolder: (elementId: string, folderPath: string) => void;
    moveFolder: (kind: string, oldPath: string, newPath: string) => void;
    addElement: (kind: string, name: string, folderPath: string) => void;
    deleteFolder: (kind: string, folderPath: string) => void;
    cancelEdit: (elementId: string) => void;
    applyEdit: (elementId: string) => void;

    // ─── User-created viewpoints (#8, #9) ─────────────────────────────
    userViewpoints: ViewpointDTO[];
    addUserViewpoint: (vp: ViewpointDTO) => void;
    updateUserViewpoint: (vp: ViewpointDTO) => void;
    deleteUserViewpoint: (id: string) => void;

    // ─── Diagram actions ──────────────────────────────────────────────
    createDiagram: (opts: { name: string; diagramType: string; viewpointId: string }) => void;
    updateDiagramElementIds: (diagramId: string, elementIds: string[]) => void;
    deleteDiagram: (diagramId: string) => void;
    applyDiagramParseResult: (diagramId: string, elementIds: string[], errors: string[]) => void;

    // ─── DHF document actions ─────────────────────────────────────────
    dhfDocuments: DhfDoc[];
    addDhfDocument: (doc: DhfDoc) => void;
    updateDhfDocumentContent: (docId: string, content: string) => void;
    removeDhfDocument: (docId: string) => void;
    /** Replace the document list from a server snapshot (no persistence echo) */
    setDhfDocuments: (docs: DhfDoc[]) => void;

    // ─── DHF global settings ──────────────────────────────────────────
    dhfSettings: DhfSettings;
    updateDhfSettings: (patch: Partial<DhfSettings>) => void;
    /** Merge settings loaded from the server (no persistence echo) */
    hydrateDhfSettings: (patch: Partial<DhfSettings>) => void;
    updateDhfDocumentMeta: (docId: string, patch: Partial<Pick<DhfDoc, 'authors' | 'approvers' | 'title'>>) => void;

    // ─── Bulk import state ────────────────────────────────────────────
    bulkImportOpen: boolean;
    importResult: { success: boolean; elementsImported: number; relationshipsImported: number; errors: string[]; warnings: string[]; generatedFile?: string } | null;
    setBulkImportOpen: (open: boolean) => void;
    setImportResult: (result: ModelState['importResult']) => void;
    clearImportResult: () => void;

    // ─── LLM state ────────────────────────────────────────────────────
    llmAvailable: boolean;
    llmProvider: string | undefined;
    llmModel: string | undefined;
    /** Pending LLM request IDs and their resolve/reject functions */
    llmPending: Map<string, { resolve: (value: any) => void; reject: (err: Error) => void }>;
    setLlmStatus: (available: boolean, provider?: string, model?: string) => void;
    registerLlmRequest: (requestId: string, resolve: (v: any) => void, reject: (e: Error) => void) => void;
    resolveLlmRequest: (requestId: string, value: any) => void;
    rejectLlmRequest: (requestId: string, error: string) => void;
}

const restoredActiveView = restoreActiveView();

export const useModelStore = create<ModelState>((set, get) => ({
    // Data
    model: null,
    validation: null,
    completeness: null,
    connected: false,
    restartRequired: null,
    methodology: null,

    // UI state
    activeMode: restoredActiveView.type === 'diagram' ? 'diagram' : 'catalog' as AppMode,
    activeView: restoredActiveView,
    explorerTab: 'model' as ExplorerTab,
    selectedElementId: null,
    selectedRelationshipId: null,
    selectedElementIds: new Set<string>(),
    recentlyVisited: [],
    selectedViewpointId: null,
    selectedDiagramId: restoredActiveView.type === 'diagram' ? restoredActiveView.diagramId : null,
    searchTerm: '',
    sidebarCollapsed: false,
    propertiesPanelCollapsed: true,
    hiddenLayers: new Set<string>(),
    ontologyGroupBy: 'layer' as GroupBy,
    collapsedGroups: new Set<string>(),

    // Ontology selection (Phase C2)
    availableOntologies: [],
    selectedOntologies: new Set<string>(),
    focusedOntologyId: null,
    selectedOntologyKind: null,
    ontologyViewMode: 'visual' as const,
    showOntologyRelationships: false,
    highlightedRelationshipType: null,
    // Tracing edges hidden by default in the ontology decomposition diagram (N-ONTO §6.3).
    // `extends` is the only type hidden by default — toolbar toggle reveals it.
    hiddenEdgeTypes: new Set<string>(['extends']),
    ontologyInstallStatus: { installing: false },

    // Gap bar
    gapBarExpanded: false,
    gapBarHeight: 160,

    // Catalog state — collapsed by default for semantic grouping
    catalogGroupBy: 'semantic' as CatalogGroupBy,
    catalogCollapsed: new Set<string>(),
    contextMenu: null,
    attributeFilter: null,
    labelFilter: null,
    tagFilters: [],

    // User-created viewpoints (in-memory; migrates any legacy localStorage data on first load)
    userViewpoints: migrateLegacyViewpoints(),

    // Sidecar layouts
    diagramLayouts: {},
    mergeDiagramLayouts: (layouts) => set((s) => ({
        diagramLayouts: { ...s.diagramLayouts, ...layouts },
    })),
    setNodeLayout: (diagramId, nodeId, pos) => set((s) => {
        const prev = s.diagramLayouts[diagramId] ?? { nodes: {}, edges: {} };
        return {
            diagramLayouts: {
                ...s.diagramLayouts,
                [diagramId]: {
                    ...prev,
                    nodes: { ...prev.nodes, [nodeId]: { ...(prev.nodes[nodeId] ?? {}), ...pos } },
                },
            },
        };
    }),

    // Diagram parse errors
    diagramParseErrors: {},

    // DHF documents
    dhfDocuments: [],

    // DHF global settings
    dhfSettings: {
        company: '',
        product: '',
        deviceType: '',
        version: '0.1',
        phase: '',
        logoUrl: '',
        compactLogoUrl: '',
        primaryColor: '#1B3A4B',
        compactMode: false,
        headerTemplate: '**{{project.product}}** | {{id}} | Rev {{project.version}}',
        footerTemplate: 'Confidential — {{project.company}} | Page {{page}}',
        documentNumberingPrefix: 'DOC',
    },

    // Bulk import
    bulkImportOpen: false,
    importResult: null,

    // LLM
    llmAvailable: false,
    llmProvider: undefined,
    llmModel: undefined,
    llmPending: new Map(),
    setLlmStatus: (available, provider, model) => set({ llmAvailable: available, llmProvider: provider, llmModel: model }),
    registerLlmRequest: (requestId, resolve, reject) => set((s) => {
        const next = new Map(s.llmPending);
        next.set(requestId, { resolve, reject });
        return { llmPending: next };
    }),
    resolveLlmRequest: (requestId, value) => set((s) => {
        const entry = s.llmPending.get(requestId);
        if (entry) {
            entry.resolve(value);
            const next = new Map(s.llmPending);
            next.delete(requestId);
            return { llmPending: next };
        }
        return {};
    }),
    rejectLlmRequest: (requestId, error) => set((s) => {
        const entry = s.llmPending.get(requestId);
        if (entry) {
            entry.reject(new Error(error));
            const next = new Map(s.llmPending);
            next.delete(requestId);
            return { llmPending: next };
        }
        return {};
    }),

    // Editing
    analysisIssues: [],
    editingElementId: null,
    pendingEdits: new Map(),

    // Actions
    setRestartRequired: (msg) => set({ restartRequired: msg }),
    setMethodology: (m) => set({ methodology: m }),
    setModel: (model) => set((s) => {
        let activeView = s.activeView;
        let selectedDiagramId = s.selectedDiagramId;
        let selectedViewpointId = s.selectedViewpointId;
        if (activeView.type === 'diagram') {
            const requestedDiagramId = activeView.diagramId;
            const exact = model.diagrams?.find(diagram => diagram.id === requestedDiagramId);
            const previous = s.model?.diagrams?.find(diagram => diagram.id === requestedDiagramId);
            const replacement = exact ?? (previous?.sourceFile
                ? model.diagrams?.find(diagram => diagram.sourceFile === previous.sourceFile)
                : undefined);
            if (replacement) {
                // Keep the active-view reference stable when a rebuild keeps
                // the same diagram. Replacing it here made source saves look
                // like navigation and refreshed the editor/canvas tree.
                if (replacement.id !== requestedDiagramId) {
                    activeView = { type: 'diagram', diagramId: replacement.id };
                    persistActiveView(activeView);
                }
                selectedDiagramId = replacement.id;
                selectedViewpointId = replacement.viewpointId === '__model' ? null : replacement.viewpointId;
            }
            // If a file is temporarily invalid while being edited, retain the
            // requested diagram instead of navigating elsewhere. The next
            // successful model update will reconcile it again.
        } else if ((activeView.type === 'welcome' || activeView.type === 'dashboard')
            && Object.keys(model.elements).length > 0) {
            activeView = { type: 'dashboard' };
        }
        return { model, activeView, selectedDiagramId, selectedViewpointId };
    }),
    setValidation: (validation) => set({ validation }),
    setCompleteness: (completeness) => set({ completeness }),
    setConnected: (connected) => set({ connected }),
    setAnalysisIssues: (issues) => set({ analysisIssues: issues }),
    setActiveMode: (mode) => set({ activeMode: mode }),
    setActiveView: (view) => {
        persistActiveView(view);
        set({ activeView: view });
    },
    setExplorerTab: (tab) => set({ explorerTab: tab }),
    selectElement: (id) => {
        if (id) {
            set((s) => {
                const next = [id, ...s.recentlyVisited.filter(x => x !== id)].slice(0, 20);
                return {
                    selectedElementId: id,
                    activeView: { type: 'element-detail', elementId: id },
                    recentlyVisited: next,
                };
            });
        } else {
            set({ selectedElementId: id });
        }
    },
    // Diagram selection updates the side properties browser without replacing
    // the active diagram with the full-page element detail route.
    inspectElement: (id) => set((s) => ({
        selectedElementId: id,
        selectedRelationshipId: null,
        propertiesPanelCollapsed: id ? false : s.propertiesPanelCollapsed,
        recentlyVisited: id
            ? [id, ...s.recentlyVisited.filter(x => x !== id)].slice(0, 20)
            : s.recentlyVisited,
    })),
    inspectRelationship: (id) => set({
        selectedRelationshipId: id,
        selectedElementId: null,
        propertiesPanelCollapsed: id ? false : get().propertiesPanelCollapsed,
    }),
    toggleElementSelection: (id) => set((s) => {
        const next = new Set(s.selectedElementIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { selectedElementIds: next };
    }),
    selectAllElements: (ids) => set({ selectedElementIds: new Set(ids) }),
    clearElementSelection: () => set({ selectedElementIds: new Set() }),
    updateElementKind: (elementId, newKind) => {
        const { model } = get();
        if (!model) return;
        const el = model.elements[elementId];
        if (!el) return;
        const updated = { ...el, kind: newKind };
        set((s) => ({
            model: s.model ? { ...s.model, elements: { ...s.model.elements, [elementId]: updated } } : null
        }));
        sendElementUpdate(updated);
    },
    bulkUpdateAttributes: (elementIds, attributes) => {
        const { model } = get();
        if (!model) return;
        const newElements = { ...model.elements };
        for (const id of elementIds) {
            const el = newElements[id];
            if (!el) continue;
            const updated = { ...el, attributes: { ...el.attributes, ...attributes } };
            newElements[id] = updated;
            sendElementUpdate(updated);
        }
        set((s) => ({
            model: s.model ? { ...s.model, elements: newElements } : null
        }));
    },
    selectViewpoint: (id) => set({ selectedViewpointId: id, selectedDiagramId: null }),
    selectDiagram: (id) => {
        if (!id) {
            set({ selectedDiagramId: null });
            return;
        }
        // When selecting a diagram, also set its viewpoint
        const { model } = get();
        const diagram = model?.diagrams?.find(d => d.id === id);
        if (diagram) {
            set({
                selectedDiagramId: id,
                selectedViewpointId: diagram.viewpointId === '__model' ? null : diagram.viewpointId,
            });
        } else {
            set({ selectedDiagramId: id });
        }
    },
    setSearchTerm: (term) => set({ searchTerm: term }),
    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    togglePropertiesPanel: () => set((s) => ({ propertiesPanelCollapsed: !s.propertiesPanelCollapsed })),
    toggleLayerVisibility: (layer) => set((s) => {
        const next = new Set(s.hiddenLayers);
        if (next.has(layer)) next.delete(layer);
        else next.add(layer);
        return { hiddenLayers: next };
    }),
    setOntologyGroupBy: (groupBy) => set({ ontologyGroupBy: groupBy, collapsedGroups: new Set() }),
    toggleGroupCollapsed: (groupId) => set((s) => {
        const next = new Set(s.collapsedGroups);
        if (next.has(groupId)) next.delete(groupId);
        else next.add(groupId);
        return { collapsedGroups: next };
    }),

    // Ontology selection actions (Phase C2)
    setAvailableOntologies: (ontologies) => set((s) => {
        // Auto-populate selectedOntologies from packages marked selected: true
        let selected = new Set<string>(ontologies.filter(o => o.selected).map(o => o.name));

        // Canonical foundation packages that must always be selected when available.
        // These are the base ontologies every project depends on.
        const FOUNDATION_PACKAGES = ['@memo/ontology'];
        for (const o of ontologies) {
            if (FOUNDATION_PACKAGES.includes(o.name)) selected.add(o.name);
        }

        // If still nothing selected (no config, no foundation), select all
        if (selected.size === 0 && ontologies.length > 0) {
            selected = new Set(ontologies.map(o => o.name));
        }

        // Default focus to first selected package
        const focused = s.focusedOntologyId ?? (selected.size > 0 ? [...selected][0] : null);
        return { availableOntologies: ontologies, selectedOntologies: selected, focusedOntologyId: focused };
    }),
    toggleOntologySelection: (packageName) => set((s) => {
        const next = new Set(s.selectedOntologies);
        if (next.has(packageName)) next.delete(packageName);
        else next.add(packageName);
        return { selectedOntologies: next };
    }),
    setFocusedOntology: (packageName) => set({ focusedOntologyId: packageName }),
    setSelectedOntologyKind: (kind) => set({ selectedOntologyKind: kind }),
    setOntologyViewMode: (mode) => set({ ontologyViewMode: mode }),
    toggleOntologyRelationships: () => set((s) => ({ showOntologyRelationships: !s.showOntologyRelationships })),
    setHighlightedRelationshipType: (type) => set((s) => ({
        highlightedRelationshipType: s.highlightedRelationshipType === type ? null : type,
    })),
    toggleHiddenEdgeType: (type) => set((s) => {
        const next = new Set(s.hiddenEdgeTypes);
        if (next.has(type)) next.delete(type);
        else next.add(type);
        return { hiddenEdgeTypes: next };
    }),
    saveOntologySelection: () => {
        const { model, availableOntologies, selectedOntologies } = get();
        if (!model) return { success: true };

        // Find kinds belonging to deselected ontologies
        const deselectedPackages = availableOntologies.filter(o => !selectedOntologies.has(o.name));
        const deselectedKinds = new Set<string>();
        for (const pkg of deselectedPackages) {
            for (const layer of pkg.layers) {
                for (const kind of layer.kinds) {
                    deselectedKinds.add(kind.name);
                }
            }
        }

        // Collect orphaned elements
        const orphanedElements: OrphanedElement[] = [];
        if (deselectedKinds.size > 0) {
            for (const el of Object.values(model.elements)) {
                if (deselectedKinds.has(el.kind)) {
                    const fromPkg = deselectedPackages.find(p =>
                        p.layers.some(l => l.kinds.some(k => k.name === el.kind))
                    );
                    orphanedElements.push({
                        elementId: el.id,
                        elementName: el.name,
                        kind: el.kind,
                        fromOntology: fromPkg?.name ?? 'unknown',
                    });
                }
            }
        }

        return { success: true, orphanedElements };
    },

    setOntologyInstallStatus: (status) => set({ ontologyInstallStatus: status }),

    // Gap bar actions
    toggleGapBar: () => set((s) => ({ gapBarExpanded: !s.gapBarExpanded })),
    setGapBarHeight: (height) => set({ gapBarHeight: Math.max(80, Math.min(400, height)) }),

    // Catalog actions
    setCatalogGroupBy: (groupBy) => set({ catalogGroupBy: groupBy, catalogCollapsed: new Set() }),
    toggleCatalogCollapsed: (groupId) => set((s) => {
        const next = new Set(s.catalogCollapsed);
        if (next.has(groupId)) next.delete(groupId);
        else next.add(groupId);
        return { catalogCollapsed: next };
    }),
    setCatalogCollapsedAll: (collapsed) => set((s) => {
        if (collapsed) {
            // Collapse all — we'll compute group keys externally and pass them
            return { catalogCollapsed: new Set(['__ALL__']) };
        }
        return { catalogCollapsed: new Set() };
    }),
    setContextMenu: (menu) => set({ contextMenu: menu }),
    setAttributeFilter: (filter) => set({ attributeFilter: filter }),
    setLabelFilter: (label) => set({ labelFilter: label }),
    toggleTagFilter: (tag) => set((s) => {
        const next = s.tagFilters.includes(tag)
            ? s.tagFilters.filter(t => t !== tag)
            : [...s.tagFilters, tag];
        return { tagFilters: next };
    }),
    clearTagFilters: () => set({ tagFilters: [] }),

    // Editing actions
    setEditingElement: (id) => set({ editingElementId: id }),
    updateElementField: (elementId, field, value) => set((s) => {
        const edits = new Map(s.pendingEdits);
        const current = edits.get(elementId) || {};
        edits.set(elementId, { ...current, [field]: value });
        return { pendingEdits: edits };
    }),
    updateElementAttribute: (elementId, key, value) => set((s) => {
        const edits = new Map(s.pendingEdits);
        const current = edits.get(elementId) || {};
        const attrs = { ...(current.attributes || {}), [key]: value };
        edits.set(elementId, { ...current, attributes: attrs });
        return { pendingEdits: edits };
    }),
    updateElementFolder: (elementId, folderPath) => {
        const el = get().model?.elements[elementId];
        if (!el) return;
        
        // Immediate update and sync (DnD usually doesn't have "Save/Cancel")
        const updated = {
            ...el,
            attributes: { ...el.attributes, [FOLDER_ATTR]: folderPath }
        };
        
        set((s) => ({
            model: s.model ? {
                ...s.model,
                elements: { ...s.model.elements, [elementId]: updated }
            } : null
        }));
        
        sendElementUpdate(updated);
    },
    moveFolder: (kind, oldPath, newPath) => {
        const s = get();
        if (!s.model) return;
        const newElements = { ...s.model.elements };
        const changedIds: string[] = [];

        for (const [id, el] of Object.entries(newElements)) {
            if (el.kind === kind) {
                const currentFolder = el.attributes[FOLDER_ATTR] || '';
                if (currentFolder === oldPath || currentFolder.startsWith(oldPath + '/')) {
                    const subPath = currentFolder.slice(oldPath.length);
                    const updatedFolder = (newPath + subPath).replace('//', '/');
                    const updated = {
                        ...el,
                        attributes: { ...el.attributes, [FOLDER_ATTR]: updatedFolder }
                    };
                    newElements[id] = updated;
                    changedIds.push(id);
                }
            }
        }

        if (changedIds.length === 0) return;

        set((state) => ({
            model: state.model ? { ...state.model, elements: newElements } : null
        }));

        // Sync to server
        for (const id of changedIds) {
            sendElementUpdate(newElements[id]);
        }
    },
    addElement: (kind, name, folderPath) => {
        const s = get();
        if (!s.model) return;
        const id = `${kind.toLowerCase().replace(/\s+/g, '_')}_${Math.random().toString(36).substr(2, 5)}`;
        const ref = Object.values(s.model.elements).find(e => e.kind === kind);
        const newElement: MemoElement = {
            id, name, kind, construct: ref?.construct || 'part',
            layer: ref?.layer || 'Other', doc: '',
            attributes: { [FOLDER_ATTR]: folderPath },
            file: ref?.file || 'model/generated.sysml',
        };

        set((state) => ({
            model: state.model ? { ...state.model, elements: { ...state.model.elements, [id]: newElement } } : null,
            selectedElementId: id,
            activeView: { type: 'element-detail', elementId: id }
        }));

        sendElementCreate(newElement);
    },
    deleteFolder: (kind, folderPath) => {
        const s = get();
        if (!s.model) return;
        const newElements = { ...s.model.elements };
        const parentPath = folderPath.includes('/') ? folderPath.split('/').slice(0, -1).join('/') : '';
        const changedIds: string[] = [];

        for (const [id, el] of Object.entries(newElements)) {
            if (el.kind === kind) {
                const currentFolder = el.attributes[FOLDER_ATTR] || '';
                if (currentFolder === folderPath || currentFolder.startsWith(folderPath + '/')) {
                    const updatedFolder = currentFolder.replace(folderPath, parentPath).replace('//', '/');
                    const updated = {
                        ...el,
                        attributes: { ...el.attributes, [FOLDER_ATTR]: updatedFolder }
                    };
                    newElements[id] = updated;
                    changedIds.push(id);
                }
            }
        }

        if (changedIds.length === 0) return;

        set((state) => ({
            model: state.model ? { ...state.model, elements: newElements } : null
        }));

        for (const id of changedIds) {
            sendElementUpdate(newElements[id]);
        }
    },
    addUserViewpoint: (vp) => set((s) => ({ userViewpoints: [...s.userViewpoints, vp] })),
    updateUserViewpoint: (vp) => set((s) => ({
        userViewpoints: s.userViewpoints.map(v => v.id === vp.id ? vp : v),
    })),
    deleteUserViewpoint: (id) => set((s) => ({
        userViewpoints: s.userViewpoints.filter(v => v.id !== id),
        selectedViewpointId: s.selectedViewpointId === id ? null : s.selectedViewpointId,
    })),
    createDiagram: ({ name, diagramType, viewpointId }) => {
        const id = `diag_${Math.random().toString(36).substr(2, 9)}`;
        const diagram: DiagramDTO = { id, name, diagramType, viewpointId, auto: false, elementIds: [] };
        set((s) => ({
            model: s.model ? { ...s.model, diagrams: [...(s.model.diagrams ?? []), diagram] } : null,
            selectedDiagramId: id,
            activeView: { type: 'diagram', diagramId: id },
        }));
        sendDiagramCreate({ id, name, diagramType, viewpointId, elementIds: [] });
    },
    updateDiagramElementIds: (diagramId, elementIds) => {
        const { model } = get();
        if (!model?.diagrams) return;
        const idx = model.diagrams.findIndex(d => d.id === diagramId);
        if (idx < 0) return;
        const updated = { ...model.diagrams[idx], elementIds };
        const diagrams = [...model.diagrams];
        diagrams[idx] = updated;
        set((s) => ({ model: s.model ? { ...s.model, diagrams } : null }));
        sendDiagramUpdate({ id: diagramId, elementIds });
    },
    deleteDiagram: (diagramId) => {
        set((s) => ({
            model: s.model ? { ...s.model, diagrams: (s.model.diagrams ?? []).filter(d => d.id !== diagramId) } : null,
            selectedDiagramId: s.selectedDiagramId === diagramId ? null : s.selectedDiagramId,
            activeView: (s.activeView.type === 'diagram' && s.activeView.diagramId === diagramId)
                ? { type: 'welcome' }
                : s.activeView,
        }));
        sendDiagramDelete(diagramId);
    },
    applyDiagramParseResult: (diagramId, elementIds, errors) => {
        const { model } = get();
        if (!model?.diagrams) return;
        const idx = model.diagrams.findIndex(d => d.id === diagramId);
        if (idx >= 0) {
            const updated = { ...model.diagrams[idx], elementIds };
            const diagrams = [...model.diagrams];
            diagrams[idx] = updated;
            set((s) => ({
                model: s.model ? { ...s.model, diagrams } : null,
                diagramParseErrors: { ...s.diagramParseErrors, [diagramId]: errors },
            }));
            sendDiagramUpdate({ id: diagramId, elementIds });
        } else {
            set((s) => ({ diagramParseErrors: { ...s.diagramParseErrors, [diagramId]: errors } }));
        }
    },
    addDhfDocument: (doc) => set((s) => ({ dhfDocuments: [...s.dhfDocuments, doc] })),
    setDhfDocuments: (docs) => set({ dhfDocuments: docs }),
    hydrateDhfSettings: (patch) => set((s) => ({ dhfSettings: { ...s.dhfSettings, ...patch } })),
    updateDhfSettings: (patch) => set((s) => ({ dhfSettings: { ...s.dhfSettings, ...patch } })),
    updateDhfDocumentMeta: (docId, patch) => set((s) => ({
        dhfDocuments: s.dhfDocuments.map(d => d.id === docId ? { ...d, ...patch } : d),
    })),
    updateDhfDocumentContent: (docId, content) => set((s) => ({
        dhfDocuments: s.dhfDocuments.map(d => d.id === docId ? { ...d, content } : d),
    })),
    removeDhfDocument: (docId) => set((s) => ({
        dhfDocuments: s.dhfDocuments.filter(d => d.id !== docId),
        activeView: s.activeView.type === 'dhf-document' && s.activeView.docId === docId
            ? { type: 'dhf-dashboard' }
            : s.activeView,
    })),
    setBulkImportOpen: (open) => set({ bulkImportOpen: open }),
    setImportResult: (result) => set({ importResult: result }),
    clearImportResult: () => set({ importResult: null }),
    cancelEdit: (elementId) => set((s) => {
        const newEdits = new Map(s.pendingEdits);
        newEdits.delete(elementId);
        return { pendingEdits: newEdits };
    }),
    applyEdit: async (elementId) => {
        const { pendingEdits, model } = get();
        const edit = pendingEdits.get(elementId);
        if (!edit || !model) return;

        const el = model.elements[elementId];
        if (!el) return;
        const updated = { ...el };
        if (edit.doc !== undefined) updated.doc = edit.doc;
        if (edit.attributes) updated.attributes = { ...el.attributes, ...edit.attributes };

        // 1. Sync to server
        if (elementId.startsWith('new_')) {
            sendElementCreate(updated);
        } else {
            sendElementUpdate(updated);
        }

        // 2. Local update
        const newModel = { ...model, elements: { ...model.elements, [elementId]: updated } };
        const newEdits = new Map(pendingEdits);
        newEdits.delete(elementId);
        set({ model: newModel, pendingEdits: newEdits });
    },
}));

// ─── Derived selectors ──────────────────────────────────────────────────────

export function getElements(model: MemoModelDTO | null): MemoElement[] {
    if (!model) return [];
    return Object.values(model.elements);
}

export function getElementsByLayer(model: MemoModelDTO | null): Map<string, MemoElement[]> {
    const map = new Map<string, MemoElement[]>();
    if (!model) return map;
    for (const el of Object.values(model.elements)) {
        if (!map.has(el.layer)) map.set(el.layer, []);
        map.get(el.layer)!.push(el);
    }
    return map;
}

export function getElementsByKind(model: MemoModelDTO | null): Map<string, MemoElement[]> {
    const map = new Map<string, MemoElement[]>();
    if (!model) return map;
    for (const el of Object.values(model.elements)) {
        if (!map.has(el.kind)) map.set(el.kind, []);
        map.get(el.kind)!.push(el);
    }
    return map;
}

export function getRelationshipsForElement(
    model: MemoModelDTO | null,
    elementId: string
): MemoRelationship[] {
    if (!model) return [];
    return model.relationships.filter(
        r => r.sourceId === elementId || r.targetId === elementId
    );
}

/** Get all unique attribute keys across all elements */
export function getAllAttributeKeys(model: MemoModelDTO | null): string[] {
    if (!model) return [];
    const keys = new Set<string>();
    for (const el of Object.values(model.elements)) {
        for (const k of Object.keys(el.attributes)) {
            if (k !== 'name') keys.add(k);
        }
    }
    return [...keys].sort();
}

/** Get all unique labels (from 'labels' attribute) across all elements */
export function getAllLabels(model: MemoModelDTO | null): string[] {
    if (!model) return [];
    const labels = new Set<string>();
    for (const el of Object.values(model.elements)) {
        const lbl = el.attributes['labels'] || el.attributes['tags'];
        if (lbl) {
            for (const l of lbl.split(',').map(s => s.trim())) {
                if (l) labels.add(l);
            }
        }
    }
    return [...labels].sort();
}

/** Get tags for an element (from 'tags' attribute, comma-separated) */
export function getElementTags(el: MemoElement): string[] {
    const raw = el.attributes['tags'] || el.attributes['labels'] || '';
    return raw.split(',').map(s => s.trim()).filter(Boolean);
}

/** Get group for an element (from 'group' attribute) */
export function getElementGroup(el: MemoElement): string | null {
    return el.attributes['group'] || null;
}

/** Get all unique groups within a specific kind */
export function getGroupsForKind(model: MemoModelDTO | null, kind: string): string[] {
    if (!model) return [];
    const groups = new Set<string>();
    for (const el of Object.values(model.elements)) {
        if (el.kind === kind) {
            const g = el.attributes['group'];
            if (g) groups.add(g);
        }
    }
    return [...groups].sort();
}

/** Get all unique tags across all elements */
export function getAllTags(model: MemoModelDTO | null): string[] {
    if (!model) return [];
    const tags = new Set<string>();
    for (const el of Object.values(model.elements)) {
        for (const t of getElementTags(el)) tags.add(t);
    }
    return [...tags].sort();
}

/** Get a diagram by ID from the model */
export function getDiagram(model: MemoModelDTO | null, diagramId: string | null): DiagramDTO | null {
    if (!model || !diagramId || !model.diagrams) return null;
    return model.diagrams.find(d => d.id === diagramId) ?? null;
}

/** Get diagrams for a specific viewpoint */
export function getDiagramsForViewpoint(model: MemoModelDTO | null, viewpointId: string): DiagramDTO[] {
    if (!model?.diagrams) return [];
    return model.diagrams.filter(d => d.viewpointId === viewpointId);
}
