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
} from '@memo/core';
import type { ValidationResult, CompletenessReport } from '@memo/core';

/** @deprecated Legacy 6-mode type — kept for backward compat during transition */
export type AppMode = 'catalog' | 'diagram' | 'scenario' | 'ontology' | 'actionflow' | 'dsm';

/** Active view in the unified canvas */
export type ActiveView =
    | { type: 'diagram'; diagramId: string }
    | { type: 'actionflow' }
    | { type: 'dsm' }
    | { type: 'ontology' }
    | { type: 'traceability' }
    | { type: 'welcome' };

/** Which explorer tab is active in the left panel */
export type ExplorerTab = 'model' | 'views';

export type GroupBy = 'layer' | 'kind' | 'construct' | 'source';
export type CatalogGroupBy = 'semantic';  // V-Cycle is the only sensible top-level grouping

export interface ContextMenuState {
    x: number;
    y: number;
    elementId?: string;
    groupKey?: string;
}

export interface ModelState {
    // ─── Data ─────────────────────────────────────────────────────────────
    model: MemoModelDTO | null;
    validation: ValidationResult | null;
    completeness: CompletenessReport | null;
    connected: boolean;

    // ─── UI State ─────────────────────────────────────────────────────────
    activeMode: AppMode;
    activeView: ActiveView;
    explorerTab: ExplorerTab;
    selectedElementId: string | null;
    selectedViewpointId: string | null;
    selectedDiagramId: string | null;
    searchTerm: string;
    sidebarCollapsed: boolean;
    propertiesPanelCollapsed: boolean;
    hiddenLayers: Set<string>;
    ontologyGroupBy: GroupBy;
    collapsedGroups: Set<string>;

    // ─── Catalog State ────────────────────────────────────────────────────
    catalogGroupBy: CatalogGroupBy;
    catalogCollapsed: Set<string>;
    contextMenu: ContextMenuState | null;
    attributeFilter: { key: string; value: string } | null;
    labelFilter: string | null;
    tagFilters: string[];  // active tag filters (AND logic)

    // ─── Editing ──────────────────────────────────────────────────────────
    editingElementId: string | null;
    pendingEdits: Map<string, Partial<{ doc: string; attributes: Record<string, string> }>>;

    // ─── Actions ──────────────────────────────────────────────────────────
    setModel: (model: MemoModelDTO) => void;
    setValidation: (validation: ValidationResult) => void;
    setCompleteness: (completeness: CompletenessReport) => void;
    setConnected: (connected: boolean) => void;
    setActiveMode: (mode: AppMode) => void;
    setActiveView: (view: ActiveView) => void;
    setExplorerTab: (tab: ExplorerTab) => void;
    selectElement: (id: string | null) => void;
    selectViewpoint: (id: string | null) => void;
    selectDiagram: (id: string | null) => void;
    setSearchTerm: (term: string) => void;
    toggleSidebar: () => void;
    togglePropertiesPanel: () => void;
    toggleLayerVisibility: (layer: string) => void;
    setOntologyGroupBy: (groupBy: GroupBy) => void;
    toggleGroupCollapsed: (groupId: string) => void;

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
    applyEdit: (elementId: string) => void;
}

export const useModelStore = create<ModelState>((set, get) => ({
    // Data
    model: null,
    validation: null,
    completeness: null,
    connected: false,

    // UI state
    activeMode: 'catalog' as AppMode,
    activeView: { type: 'welcome' } as ActiveView,
    explorerTab: 'model' as ExplorerTab,
    selectedElementId: null,
    selectedViewpointId: null,
    selectedDiagramId: null,
    searchTerm: '',
    sidebarCollapsed: false,
    propertiesPanelCollapsed: false,
    hiddenLayers: new Set<string>(),
    ontologyGroupBy: 'layer' as GroupBy,
    collapsedGroups: new Set<string>(),

    // Catalog state — collapsed by default for semantic grouping
    catalogGroupBy: 'semantic' as CatalogGroupBy,
    catalogCollapsed: new Set<string>(),
    contextMenu: null,
    attributeFilter: null,
    labelFilter: null,
    tagFilters: [],

    // Editing
    editingElementId: null,
    pendingEdits: new Map(),

    // Actions
    setModel: (model) => set({ model }),
    setValidation: (validation) => set({ validation }),
    setCompleteness: (completeness) => set({ completeness }),
    setConnected: (connected) => set({ connected }),
    setActiveMode: (mode) => set({ activeMode: mode }),
    setActiveView: (view) => set({ activeView: view }),
    setExplorerTab: (tab) => set({ explorerTab: tab }),
    selectElement: (id) => set({ selectedElementId: id }),
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
    applyEdit: (elementId) => {
        const { pendingEdits, model } = get();
        const edit = pendingEdits.get(elementId);
        if (!edit || !model) return;

        // Optimistic update to local model
        const el = model.elements[elementId];
        if (!el) return;
        const updated = { ...el };
        if (edit.doc !== undefined) updated.doc = edit.doc;
        if (edit.attributes) updated.attributes = { ...el.attributes, ...edit.attributes };

        const newModel = {
            ...model,
            elements: { ...model.elements, [elementId]: updated },
        };

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
