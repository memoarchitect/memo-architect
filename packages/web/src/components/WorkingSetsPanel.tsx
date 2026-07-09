import { useState, useEffect, useCallback } from 'react';
import { useModelStore } from '../store/model-store';
import { useWorkspaceStore, type WorkingSetState } from '../store/workspace-store';

export function WorkingSetsPanel() {
    const { workingSets, activeWorkingSetId, loadFromStorage, saveWorkingSet, updateWorkingSet, renameWorkingSet, deleteWorkingSet, setActiveWorkingSet } = useWorkspaceStore();
    const modelStore = useModelStore();
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

    const captureState = useCallback((): WorkingSetState => ({
        activeView: modelStore.activeView,
        explorerTab: modelStore.explorerTab,
        selectedElementId: modelStore.selectedElementId,
        selectedViewpointId: modelStore.selectedViewpointId,
        selectedDiagramId: modelStore.selectedDiagramId,
        sidebarCollapsed: modelStore.sidebarCollapsed,
        propertiesPanelCollapsed: modelStore.propertiesPanelCollapsed,
        hiddenLayers: [...modelStore.hiddenLayers],
    }), [modelStore]);

    const restoreState = useCallback((state: WorkingSetState) => {
        modelStore.setActiveView(state.activeView);
        modelStore.setExplorerTab(state.explorerTab);
        modelStore.selectElement(state.selectedElementId);
        modelStore.selectViewpoint(state.selectedViewpointId);
        if (state.selectedDiagramId) modelStore.selectDiagram(state.selectedDiagramId);
        // Restore sidebar/properties panel state
        if (state.sidebarCollapsed !== modelStore.sidebarCollapsed) modelStore.toggleSidebar();
        if (state.propertiesPanelCollapsed !== modelStore.propertiesPanelCollapsed) modelStore.togglePropertiesPanel();
    }, [modelStore]);

    const handleSave = () => {
        const name = newName.trim() || `Working Set ${workingSets.length + 1}`;
        saveWorkingSet(name, captureState());
        setNewName('');
    };

    const handleRestore = (id: string) => {
        const ws = workingSets.find(w => w.id === id);
        if (ws) {
            restoreState(ws.state);
            setActiveWorkingSet(id);
        }
    };

    const handleUpdate = (id: string) => {
        updateWorkingSet(id, captureState());
    };

    const handleRename = (id: string) => {
        if (editName.trim()) {
            renameWorkingSet(id, editName.trim());
        }
        setEditingId(null);
    };

    const viewLabel = (state: WorkingSetState): string => {
        switch (state.activeView.type) {
            case 'diagram': return 'Diagram';
            case 'dsm': return 'DSM';
            case 'traceability': return 'Trace Matrix';
            case 'ontology': return 'Ontology';
            case 'scenario-editor': return 'Scenarios';
            case 'model-diff': return 'Diff';
            case 'compliance-wizard': return 'Compliance';
            case 'statistics': return 'Stats';
            default: return 'Welcome';
        }
    };

    return (
        <div className="text-xs">
            {/* Save new */}
            <div className="flex gap-1 mb-2">
                <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    placeholder="Working set name..."
                    className="flex-1 px-2 py-1.5 rounded focus:outline-none"
                    style={{ background: '#F7F7F5', border: '1px solid #E5E5E0', color: '#1a1a1a' }}
                />
                <button
                    onClick={handleSave}
                    className="px-2.5 py-1.5 rounded font-medium"
                    style={{ background: '#2DD4A8', color: '#FFFFFF' }}
                >
                    Save
                </button>
            </div>

            {/* Working set list */}
            {workingSets.length === 0 && (
                <div className="text-center py-4" style={{ color: '#9CA3AF' }}>
                    Save your current view state as a working set for quick switching.
                </div>
            )}
            <div className="space-y-1">
                {workingSets.map(ws => (
                    <div
                        key={ws.id}
                        className="p-2 rounded-lg"
                        style={{
                            background: activeWorkingSetId === ws.id ? '#2DD4A810' : '#FFFFFF',
                            border: `1px solid ${activeWorkingSetId === ws.id ? '#2DD4A840' : '#E5E5E0'}`,
                        }}
                    >
                        <div className="flex items-center gap-1.5">
                            {editingId === ws.id ? (
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleRename(ws.id); if (e.key === 'Escape') setEditingId(null); }}
                                    onBlur={() => handleRename(ws.id)}
                                    className="flex-1 px-1 py-0.5 rounded focus:outline-none"
                                    style={{ border: '1px solid #2DD4A8', color: '#374151' }}
                                    autoFocus
                                />
                            ) : (
                                <span
                                    className="flex-1 font-medium truncate cursor-pointer"
                                    style={{ color: '#374151' }}
                                    onDoubleClick={() => { setEditingId(ws.id); setEditName(ws.name); }}
                                >
                                    {ws.name}
                                </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#9CA3AF', fontSize: '10px' }}>
                                {viewLabel(ws.state)}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                            <button
                                onClick={() => handleRestore(ws.id)}
                                className="px-2 py-0.5 rounded"
                                style={{ background: '#2DD4A815', color: '#1B3A4B', border: '1px solid #2DD4A830' }}
                            >
                                Restore
                            </button>
                            <button
                                onClick={() => handleUpdate(ws.id)}
                                className="px-2 py-0.5 rounded"
                                style={{ background: '#F3F4F6', color: '#6B7280' }}
                            >
                                Update
                            </button>
                            <div className="flex-1" />
                            <button
                                onClick={() => deleteWorkingSet(ws.id)}
                                className="px-1.5 py-0.5 rounded"
                                style={{ color: '#E74C3C' }}
                                title="Delete"
                            >
                                {'\u2715'}
                            </button>
                        </div>
                        <div className="mt-1" style={{ color: '#D1D5DB', fontSize: '10px' }}>
                            Updated {new Date(ws.updatedAt).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
