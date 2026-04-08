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

/** Fixed slots: 0 = Last Session (auto), 1-3 = user quick slots */
export interface QuickSlot {
    name: string;
    state: WorkingSetState;
    savedAt: number;
}

interface WorkspaceStore {
    workingSets: WorkingSet[];
    activeWorkingSetId: string | null;
    /** Slots 0-3: 0 = Last Session, 1/2/3 = user slots */
    quickSlots: (QuickSlot | null)[];

    loadFromStorage: () => void;
    saveWorkingSet: (name: string, state: WorkingSetState) => string;
    updateWorkingSet: (id: string, state: WorkingSetState) => void;
    renameWorkingSet: (id: string, name: string) => void;
    deleteWorkingSet: (id: string) => void;
    setActiveWorkingSet: (id: string | null) => void;
    /** Save state to a quick slot (0 = Last Session, 1-3 = user) */
    saveQuickSlot: (slot: 0 | 1 | 2 | 3, state: WorkingSetState, name?: string) => void;
    /** Clear a quick slot */
    clearQuickSlot: (slot: 0 | 1 | 2 | 3) => void;
}

const STORAGE_KEY = 'memo-working-sets';
const QUICK_SLOTS_KEY = 'memo-quick-slots';

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

function loadQuickSlots(): (QuickSlot | null)[] {
    try {
        const raw = localStorage.getItem(QUICK_SLOTS_KEY);
        if (!raw) return [null, null, null, null];
        return JSON.parse(raw);
    } catch {
        return [null, null, null, null];
    }
}

function persistQuickSlots(slots: (QuickSlot | null)[]) {
    try {
        localStorage.setItem(QUICK_SLOTS_KEY, JSON.stringify(slots));
    } catch { /* ignore */ }
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
    workingSets: [],
    activeWorkingSetId: null,
    quickSlots: loadQuickSlots(),

    loadFromStorage: () => {
        const sets = loadFromLocalStorage();
        const quickSlots = loadQuickSlots();
        set({ workingSets: sets, quickSlots });
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

    saveQuickSlot: (slot, state, name) => {
        const slotNames = ['Last Session', 'Slot 1', 'Slot 2', 'Slot 3'];
        const next = [...get().quickSlots] as (QuickSlot | null)[];
        while (next.length < 4) next.push(null);
        next[slot] = { name: name ?? slotNames[slot], state, savedAt: Date.now() };
        persistQuickSlots(next);
        set({ quickSlots: next });
    },

    clearQuickSlot: (slot) => {
        const next = [...get().quickSlots] as (QuickSlot | null)[];
        next[slot] = null;
        persistQuickSlots(next);
        set({ quickSlots: next });
    },
}));
