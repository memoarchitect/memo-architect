// ─── Workspace Manager ─────────────────────────────────────────────────────────
//
// Dropdown in ModeSwitcher for saving/restoring named working sets.
// Quick slots 1-3 via Ctrl+1/2/3. "Last Session" auto-saved on unload.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { useModelStore } from '../store/model-store';
import { useWorkspaceStore, type WorkingSetState } from '../store/workspace-store';
import { FONT } from '../styles/tokens';

// ─── Snapshot current UI state ───────────────────────────────────────────────

function captureState(): WorkingSetState {
    const s = useModelStore.getState();
    return {
        activeView: s.activeView,
        explorerTab: s.explorerTab,
        selectedElementId: s.selectedElementId,
        selectedViewpointId: s.selectedViewpointId,
        selectedDiagramId: s.selectedDiagramId,
        sidebarCollapsed: s.sidebarCollapsed,
        propertiesPanelCollapsed: s.propertiesPanelCollapsed,
        hiddenLayers: Array.from(s.hiddenLayers),
    };
}

function restoreState(state: WorkingSetState) {
    const s = useModelStore.getState();
    s.setActiveView(state.activeView);
    s.setExplorerTab(state.explorerTab);
    s.selectElement(state.selectedElementId);
    if (state.selectedDiagramId) s.selectDiagram(state.selectedDiagramId);
    if (state.selectedViewpointId) s.selectViewpoint(state.selectedViewpointId);
}

// ─── WorkspaceManager ────────────────────────────────────────────────────────

export function WorkspaceManager() {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const quickSlots = useWorkspaceStore(s => s.quickSlots);
    const saveQuickSlot = useWorkspaceStore(s => s.saveQuickSlot);
    const clearQuickSlot = useWorkspaceStore(s => s.clearQuickSlot);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Auto-save "Last Session" on unload
    useEffect(() => {
        const handler = () => {
            saveQuickSlot(0, captureState(), 'Last Session');
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [saveQuickSlot]);

    // Ctrl+1/2/3: restore quick slot; Ctrl+Shift+1/2/3: save quick slot
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            const slot = e.key === '1' ? 1 : e.key === '2' ? 2 : e.key === '3' ? 3 : null;
            if (!slot) return;
            e.preventDefault();
            if (e.shiftKey) {
                saveQuickSlot(slot as 1 | 2 | 3, captureState());
            } else {
                const s = quickSlots[slot];
                if (s) restoreState(s.state);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [quickSlots, saveQuickSlot]);

    const SLOT_NAMES = ['Last Session', 'Slot 1', 'Slot 2', 'Slot 3'];

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all"
                style={
                    open
                        ? { background: 'rgba(45,212,168,0.15)', color: '#2DD4A8' }
                        : { background: 'transparent', color: 'rgba(255,255,255,0.5)' }
                }
                title="Workspaces (Ctrl+1/2/3 to restore, Ctrl+Shift+1/2/3 to save)"
            >
                <span>⊟</span>
                <span style={{ fontSize: '10px', marginLeft: '2px', opacity: 0.7 }}>▾</span>
            </button>

            {open && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: 0,
                        zIndex: 100,
                        background: '#132D3E',
                        border: '1px solid rgba(45,212,168,0.2)',
                        borderRadius: '8px',
                        minWidth: '240px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        overflow: 'hidden',
                    }}
                >
                    <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: FONT.xs, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                        WORKSPACES
                    </div>

                    {/* Last Session (slot 0) */}
                    <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center justify-between gap-2">
                            <span style={{ fontSize: FONT.xs, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Last Session</span>
                            {quickSlots[0] ? (
                                <button
                                    onClick={() => { restoreState(quickSlots[0]!.state); setOpen(false); }}
                                    className="px-2 py-0.5 rounded text-xs"
                                    style={{ background: 'rgba(45,212,168,0.15)', color: '#2DD4A8', border: 'none', cursor: 'pointer' }}
                                >
                                    Restore
                                </button>
                            ) : (
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>— none saved —</span>
                            )}
                        </div>
                        {quickSlots[0] && (
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                                {new Date(quickSlots[0].savedAt).toLocaleString()}
                            </div>
                        )}
                    </div>

                    {/* User quick slots 1-3 */}
                    {([1, 2, 3] as const).map(slot => {
                        const s = quickSlots[slot];
                        return (
                            <div
                                key={slot}
                                className="flex items-center gap-2 px-3 py-2"
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                            >
                                <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', minWidth: '16px' }}>
                                    ⌃{slot}
                                </span>
                                <div className="flex-1 min-w-0">
                                    {s ? (
                                        <>
                                            <div style={{ fontSize: FONT.xs, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{s.name}</div>
                                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                                                {new Date(s.savedAt).toLocaleTimeString()}
                                            </div>
                                        </>
                                    ) : (
                                        <span style={{ fontSize: FONT.xs, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>empty</span>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    {s && (
                                        <button
                                            onClick={() => { restoreState(s.state); setOpen(false); }}
                                            style={{ fontSize: '10px', padding: '2px 6px', borderRadius: 3, background: 'rgba(45,212,168,0.15)', color: '#2DD4A8', border: 'none', cursor: 'pointer' }}
                                        >
                                            Restore
                                        </button>
                                    )}
                                    <button
                                        onClick={() => saveQuickSlot(slot, captureState(), SLOT_NAMES[slot])}
                                        style={{ fontSize: '10px', padding: '2px 6px', borderRadius: 3, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer' }}
                                        title={`Save current view to Slot ${slot} (⌃⇧${slot})`}
                                    >
                                        Save
                                    </button>
                                    {s && (
                                        <button
                                            onClick={() => clearQuickSlot(slot)}
                                            style={{ fontSize: '10px', padding: '2px 4px', borderRadius: 3, background: 'transparent', color: 'rgba(255,255,255,0.3)', border: 'none', cursor: 'pointer' }}
                                            title="Clear slot"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
