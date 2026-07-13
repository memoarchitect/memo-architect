import { useState, useMemo, useCallback } from 'react';
import { useModelStore, getRelationshipsForElement } from '../store/model-store';
import { sendElementUpdate, sendAddRelationship } from '../store/ws-client';
import { LAYER_COLORS } from '../constants';
import { FONT, SHADOW, RADIUS } from '../styles/tokens';
import type { MemoElement, MemoRelationship } from '@memo/core';

// ─── Scenario Step (parsed from doc field) ──────────────────────────────────

interface ScenarioStep {
    index: number;
    text: string;
    linkedElementId?: string;
}

function parseSteps(doc: string): ScenarioStep[] {
    if (!doc) return [];
    const lines = doc.split('\n').filter(l => l.trim());
    return lines.map((line, i) => {
        const match = line.match(/^\d+\.\s*(.*)/);
        return { index: i, text: match ? match[1] : line };
    });
}

function serializeSteps(steps: ScenarioStep[]): string {
    return steps.map((s, i) => `${i + 1}. ${s.text}`).join('\n');
}

// ─── Scenario Editor Component ──────────────────────────────────────────────

export function ScenarioEditor() {
    const model = useModelStore(s => s.model);
    const selectElement = useModelStore(s => s.selectElement);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingSteps, setEditingSteps] = useState<ScenarioStep[] | null>(null);
    const [newStepText, setNewStepText] = useState('');
    const [linkingStepIndex, setLinkingStepIndex] = useState<number | null>(null);
    const [linkSearch, setLinkSearch] = useState('');

    const scenarios = useMemo(() => {
        if (!model) return [];
        return Object.values(model.elements).filter(
            e => e.kind === 'Scenario' || e.kind === 'UseCase' || e.kind === 'UserActivity'
        );
    }, [model]);

    const filteredScenarios = useMemo(() => {
        if (!searchTerm) return scenarios;
        const lower = searchTerm.toLowerCase();
        return scenarios.filter(e =>
            e.name.toLowerCase().includes(lower) ||
            e.kind.toLowerCase().includes(lower)
        );
    }, [scenarios, searchTerm]);

    const groups = useMemo(() => {
        const map = new Map<string, MemoElement[]>();
        for (const el of filteredScenarios) {
            if (!map.has(el.kind)) map.set(el.kind, []);
            map.get(el.kind)!.push(el);
        }
        return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }, [filteredScenarios]);

    const selectedElement = selectedElementId && model ? model.elements[selectedElementId] : null;
    const rels = useMemo(() => getRelationshipsForElement(model, selectedElementId || ''), [model, selectedElementId]);

    const steps = useMemo(() => {
        if (editingSteps) return editingSteps;
        if (!selectedElement) return [];
        return parseSteps(selectedElement.doc || '');
    }, [selectedElement, editingSteps]);

    const startEditing = useCallback(() => {
        if (selectedElement) {
            setEditingSteps(parseSteps(selectedElement.doc || ''));
        }
    }, [selectedElement]);

    const saveSteps = useCallback(() => {
        if (!selectedElement || !editingSteps) return;
        const doc = serializeSteps(editingSteps);
        sendElementUpdate({ ...selectedElement, doc });
        setEditingSteps(null);
    }, [selectedElement, editingSteps]);

    const addStep = useCallback(() => {
        if (!newStepText.trim()) return;
        const next = [...(editingSteps || steps), { index: steps.length, text: newStepText.trim() }];
        setEditingSteps(next);
        setNewStepText('');
    }, [newStepText, editingSteps, steps]);

    const removeStep = useCallback((idx: number) => {
        const next = (editingSteps || steps).filter((_, i) => i !== idx);
        setEditingSteps(next);
    }, [editingSteps, steps]);

    const moveStep = useCallback((idx: number, dir: -1 | 1) => {
        const arr = [...(editingSteps || steps)];
        const target = idx + dir;
        if (target < 0 || target >= arr.length) return;
        [arr[idx], arr[target]] = [arr[target], arr[idx]];
        setEditingSteps(arr);
    }, [editingSteps, steps]);

    const updateStepText = useCallback((idx: number, text: string) => {
        const arr = [...(editingSteps || steps)];
        arr[idx] = { ...arr[idx], text };
        setEditingSteps(arr);
    }, [editingSteps, steps]);

    // Link search results
    const linkCandidates = useMemo(() => {
        if (!model || !linkSearch) return [];
        const lower = linkSearch.toLowerCase();
        return Object.values(model.elements)
            .filter(e => e.id !== selectedElementId && e.name.toLowerCase().includes(lower))
            .slice(0, 10);
    }, [model, linkSearch, selectedElementId]);

    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const toggleGroup = (g: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(g)) next.delete(g); else next.add(g);
            return next;
        });
    };

    return (
        <div className="flex flex-1 overflow-hidden">
            {/* Left: Scenario list */}
            <div className="w-72 flex flex-col overflow-hidden" style={{ background: '#FFFFFF', borderRight: '1px solid #E5E5E0' }}>
                <div className="px-3 py-2" style={{ borderBottom: '1px solid #E5E5E0' }}>
                    <input
                        type="text"
                        placeholder={`Search ${scenarios.length} scenarios...`}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                        style={{ background: '#F7F7F5', border: '1px solid #E5E5E0', color: '#1a1a1a' }}
                    />
                </div>
                <div className="flex-1 overflow-y-auto text-xs py-1">
                    {groups.map(([kind, els]) => {
                        const collapsed = collapsedGroups.has(kind);
                        return (
                            <div key={kind} className="mb-0.5">
                                <div
                                    className="flex items-center gap-2 px-3 py-1.5 cursor-pointer"
                                    style={{ borderRadius: '6px', margin: '0 4px' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#F0F0ED')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    onClick={() => toggleGroup(kind)}
                                >
                                    <span className="w-2.5 h-2.5 rounded flex-shrink-0" style={{ backgroundColor: LAYER_COLORS['functional'] || '#E67E22', borderRadius: '3px' }} />
                                    <span className="font-medium flex-1" style={{ color: '#374151' }}>{kind}</span>
                                    <span style={{ color: '#9CA3AF' }}>{els.length}</span>
                                    <span style={{ color: '#D1D5DB' }}>{collapsed ? '\u25B8' : '\u25BE'}</span>
                                </div>
                                {!collapsed && els.map(el => (
                                    <div
                                        key={el.id}
                                        className="px-3 py-1 ml-6 cursor-pointer flex items-center gap-1.5"
                                        style={{
                                            borderRadius: '6px',
                                            background: selectedElementId === el.id ? '#2DD4A818' : 'transparent',
                                            color: selectedElementId === el.id ? '#1B3A4B' : '#374151',
                                            fontWeight: selectedElementId === el.id ? 500 : 400,
                                        }}
                                        onMouseEnter={e => { if (selectedElementId !== el.id) e.currentTarget.style.background = '#F0F0ED'; }}
                                        onMouseLeave={e => { if (selectedElementId !== el.id) e.currentTarget.style.background = 'transparent'; }}
                                        onClick={() => { selectElement(el.id); setEditingSteps(null); }}
                                    >
                                        <span className="truncate">{el.name}</span>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                    {groups.length === 0 && (
                        <div className="px-4 py-8 text-center" style={{ color: '#9CA3AF' }}>
                            No scenarios found.
                        </div>
                    )}
                </div>
            </div>

            {/* Center: Scenario detail + step editor */}
            <div className="flex-1 overflow-y-auto p-6" style={{ background: '#F7F7F5' }}>
                {!selectedElement && (
                    <div className="flex items-center justify-center h-full" style={{ color: '#9CA3AF' }}>
                        <div className="text-center">
                            <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>{'\u25B6'}</div>
                            <div className="text-sm">Select a scenario to edit steps and link elements</div>
                        </div>
                    </div>
                )}
                {selectedElement && (
                    <div className="max-w-2xl">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4">
                            <h2 className="text-lg font-semibold" style={{ color: '#1a1a1a' }}>{selectedElement.name}</h2>
                            <span className="px-2 py-0.5 text-xs rounded-md font-medium"
                                style={{ background: '#E67E2218', color: '#E67E22' }}>
                                {selectedElement.kind}
                            </span>
                        </div>

                        {/* Steps */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Steps</h3>
                                {!editingSteps && (
                                    <button
                                        onClick={startEditing}
                                        className="px-2 py-0.5 text-xs rounded"
                                        style={{ background: '#2DD4A815', color: '#1B3A4B', border: '1px solid #2DD4A840' }}
                                    >
                                        Edit
                                    </button>
                                )}
                                {editingSteps && (
                                    <div className="flex gap-1">
                                        <button
                                            onClick={saveSteps}
                                            className="px-2 py-0.5 text-xs rounded font-medium"
                                            style={{ background: '#2DD4A8', color: '#FFFFFF' }}
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setEditingSteps(null)}
                                            className="px-2 py-0.5 text-xs rounded"
                                            style={{ background: '#F3F4F6', color: '#6B7280' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                {steps.map((step, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-2 p-2 rounded-lg"
                                        style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}
                                    >
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                                            style={{ background: '#2DD4A815', color: '#1B3A4B' }}>
                                            {idx + 1}
                                        </span>
                                        {editingSteps ? (
                                            <input
                                                type="text"
                                                value={step.text}
                                                onChange={e => updateStepText(idx, e.target.value)}
                                                className="flex-1 text-sm px-2 py-1 rounded focus:outline-none"
                                                style={{ border: '1px solid #E5E5E0', color: '#374151' }}
                                            />
                                        ) : (
                                            <span className="flex-1 text-sm" style={{ color: '#374151' }}>{step.text}</span>
                                        )}
                                        {editingSteps && (
                                            <div className="flex gap-0.5">
                                                <button onClick={() => moveStep(idx, -1)} className="px-1 text-xs" style={{ color: '#9CA3AF' }} title="Move up">{'\u25B2'}</button>
                                                <button onClick={() => moveStep(idx, 1)} className="px-1 text-xs" style={{ color: '#9CA3AF' }} title="Move down">{'\u25BC'}</button>
                                                <button onClick={() => removeStep(idx)} className="px-1 text-xs" style={{ color: '#E74C3C' }} title="Remove">{'\u2715'}</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {editingSteps && (
                                <div className="flex gap-2 mt-2">
                                    <input
                                        type="text"
                                        value={newStepText}
                                        onChange={e => setNewStepText(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addStep()}
                                        placeholder="Add a step..."
                                        className="flex-1 text-sm px-3 py-2 rounded-lg focus:outline-none"
                                        style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', color: '#374151' }}
                                    />
                                    <button
                                        onClick={addStep}
                                        className="px-3 py-2 text-xs rounded-lg font-medium"
                                        style={{ background: '#2DD4A815', color: '#1B3A4B', border: '1px solid #2DD4A840' }}
                                    >
                                        + Add
                                    </button>
                                </div>
                            )}

                            {steps.length === 0 && !editingSteps && (
                                <div className="text-xs p-3 rounded-lg" style={{ background: '#F3F4F6', color: '#9CA3AF' }}>
                                    No steps defined. Click Edit to add scenario steps.
                                </div>
                            )}
                        </div>

                        {/* Linked Elements */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                                    Linked Elements ({rels.length})
                                </h3>
                                <button
                                    onClick={() => setLinkingStepIndex(linkingStepIndex === null ? 0 : null)}
                                    className="px-2 py-0.5 text-xs rounded"
                                    style={{ background: '#4A90D915', color: '#4A90D9', border: '1px solid #4A90D940' }}
                                >
                                    {linkingStepIndex !== null ? 'Done' : '+ Link'}
                                </button>
                            </div>

                            {linkingStepIndex !== null && (
                                <div className="mb-2 p-2 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #4A90D940' }}>
                                    <input
                                        type="text"
                                        value={linkSearch}
                                        onChange={e => setLinkSearch(e.target.value)}
                                        placeholder="Search elements to link..."
                                        className="w-full text-sm px-2 py-1 rounded focus:outline-none mb-1"
                                        style={{ border: '1px solid #E5E5E0', color: '#374151' }}
                                    />
                                    {linkCandidates.map(el => (
                                        <div
                                            key={el.id}
                                            className="flex items-center gap-2 px-2 py-1 text-xs rounded cursor-pointer"
                                            onMouseEnter={e => (e.currentTarget.style.background = '#F0F0ED')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                            onClick={() => {
                                                sendAddRelationship(selectedElement.id, el.id, 'traceTo');
                                                setLinkSearch('');
                                                setLinkingStepIndex(null);
                                            }}
                                        >
                                            <span className="w-2 h-2 rounded-full" style={{ background: LAYER_COLORS[el.layer] || '#95A5A6' }} />
                                            <span style={{ color: '#374151' }}>{el.name}</span>
                                            <span style={{ color: '#9CA3AF' }}>{el.kind}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-1">
                                {rels.map(rel => {
                                    const otherId = rel.sourceId === selectedElement.id ? rel.targetId : rel.sourceId;
                                    const other = model!.elements[otherId];
                                    const direction = rel.sourceId === selectedElement.id ? '\u2192' : '\u2190';
                                    return (
                                        <div
                                            key={rel.id}
                                            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg cursor-pointer"
                                            style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#F0F0ED')}
                                            onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
                                            onClick={() => selectElement(otherId)}
                                        >
                                            <span style={{ color: '#9CA3AF' }}>{direction}</span>
                                            <span className="font-medium" style={{ color: '#2563EB' }}>{rel.type}</span>
                                            <span style={{ color: '#374151' }}>{other?.name || otherId}</span>
                                            {other && (
                                                <span className="ml-auto px-1.5 py-0.5 rounded text-xs"
                                                    style={{ background: (LAYER_COLORS[other.layer] || '#95A5A6') + '18', color: LAYER_COLORS[other.layer] || '#95A5A6' }}>
                                                    {other.kind}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="text-xs" style={{ color: '#D1D5DB' }}>{selectedElement.file}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
