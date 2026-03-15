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
} from '@memo/core';
import type { ValidationResult, CompletenessReport } from '@memo/core';

export interface ModelState {
    // ─── Data ─────────────────────────────────────────────────────────────
    model: MemoModelDTO | null;
    validation: ValidationResult | null;
    completeness: CompletenessReport | null;
    connected: boolean;

    // ─── UI State ─────────────────────────────────────────────────────────
    selectedElementId: string | null;
    selectedViewpointId: string | null;
    searchTerm: string;
    sidebarCollapsed: boolean;
    hiddenLayers: Set<string>;

    // ─── Actions ──────────────────────────────────────────────────────────
    setModel: (model: MemoModelDTO) => void;
    setValidation: (validation: ValidationResult) => void;
    setCompleteness: (completeness: CompletenessReport) => void;
    setConnected: (connected: boolean) => void;
    selectElement: (id: string | null) => void;
    selectViewpoint: (id: string | null) => void;
    setSearchTerm: (term: string) => void;
    toggleSidebar: () => void;
    toggleLayerVisibility: (layer: string) => void;
}

export const useModelStore = create<ModelState>((set) => ({
    // Data
    model: null,
    validation: null,
    completeness: null,
    connected: false,

    // UI state
    selectedElementId: null,
    selectedViewpointId: null,
    searchTerm: '',
    sidebarCollapsed: false,
    hiddenLayers: new Set<string>(),

    // Actions
    setModel: (model) => set({ model }),
    setValidation: (validation) => set({ validation }),
    setCompleteness: (completeness) => set({ completeness }),
    setConnected: (connected) => set({ connected }),
    selectElement: (id) => set({ selectedElementId: id }),
    selectViewpoint: (id) => set({ selectedViewpointId: id }),
    setSearchTerm: (term) => set({ searchTerm: term }),
    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    toggleLayerVisibility: (layer) => set((s) => {
        const next = new Set(s.hiddenLayers);
        if (next.has(layer)) next.delete(layer);
        else next.add(layer);
        return { hiddenLayers: next };
    }),
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
