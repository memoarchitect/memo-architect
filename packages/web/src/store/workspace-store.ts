// ─── Working Sets & Workspace Persistence ────────────────────────────────────
//
// Named working sets that remember open views, selected elements, panel state.
// Persisted to localStorage for session recovery.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import type { ActiveView, ExplorerTab } from './model-store';

export interface WorkingSet {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    state: WorkingSetState;
}

export interface WorkingSetState {
    activeView: ActiveView;
    explorerTab: ExplorerTab;
    selectedElementId: string | null;
    selectedViewpointId: string | null;
    selectedDiagramId: string | null;
    sidebarCollapsed: boolean;
    propertiesPanelCollapsed: boolean;
    hiddenLayers: string[];
}

interface WorkspaceStore {
    workingSets: WorkingSet[];
    activeWorkingSetId: string | null;

    loadFromStorage: () => void;
    saveWorkingSet: (name: string, state: WorkingSetState) => string;
    updateWorkingSet: (id: string, state: WorkingSetState) => void;
    renameWorkingSet: (id: string, name: string) => void;
    deleteWorkingSet: (id: string) => void;
    setActiveWorkingSet: (id: string | null) => void;
}

const STORAGE_KEY = 'memo-working-sets';

function generateId(): string {
    return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function persistToStorage(sets: WorkingSet[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
    } catch {
        // localStorage full or unavailable
    }
}

function loadFromLocalStorage(): WorkingSet[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
    workingSets: [],
    activeWorkingSetId: null,

    loadFromStorage: () => {
        const sets = loadFromLocalStorage();
        set({ workingSets: sets });
    },

    saveWorkingSet: (name, state) => {
        const id = generateId();
        const now = Date.now();
        const ws: WorkingSet = { id, name, createdAt: now, updatedAt: now, state };
        const next = [...get().workingSets, ws];
        set({ workingSets: next, activeWorkingSetId: id });
        persistToStorage(next);
        return id;
    },

    updateWorkingSet: (id, state) => {
        const next = get().workingSets.map(ws =>
            ws.id === id ? { ...ws, state, updatedAt: Date.now() } : ws
        );
        set({ workingSets: next });
        persistToStorage(next);
    },

    renameWorkingSet: (id, name) => {
        const next = get().workingSets.map(ws =>
            ws.id === id ? { ...ws, name, updatedAt: Date.now() } : ws
        );
        set({ workingSets: next });
        persistToStorage(next);
    },

    deleteWorkingSet: (id) => {
        const next = get().workingSets.filter(ws => ws.id !== id);
        const activeId = get().activeWorkingSetId === id ? null : get().activeWorkingSetId;
        set({ workingSets: next, activeWorkingSetId: activeId });
        persistToStorage(next);
    },

    setActiveWorkingSet: (id) => set({ activeWorkingSetId: id }),
}));
