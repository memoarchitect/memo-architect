import { useState, useMemo } from 'react';
import { useModelStore } from '../store/model-store';
import { LAYER_COLORS } from '../constants';
import type { MemoElement } from '@memo/core';

export function ScenarioCatalog() {
    const model = useModelStore(s => s.model);
    const selectElement = useModelStore(s => s.selectElement);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const sidebarCollapsed = useModelStore(s => s.sidebarCollapsed);
    const toggleSidebar = useModelStore(s => s.toggleSidebar);
    const [searchTerm, setSearchTerm] = useState('');
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    // Get all scenarios, use cases, and user activities
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

    // Group by kind
    const groups = useMemo(() => {
        const map = new Map<string, MemoElement[]>();
        for (const el of filteredScenarios) {
            if (!map.has(el.kind)) map.set(el.kind, []);
            map.get(el.kind)!.push(el);
        }
        return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }, [filteredScenarios]);

    const toggleGroup = (g: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(g)) next.delete(g);
            else next.add(g);
            return next;
        });
    };

    const selectedElement = selectedElementId && model ? model.elements[selectedElementId] : null;

    return (
        <div className="flex flex-1 overflow-hidden">
            {/* Left: Scenario tree */}
            {sidebarCollapsed && (
                <div
                    className="flex flex-col items-center flex-shrink-0 cursor-pointer"
                    style={{ width: '40px', background: 'linear-gradient(180deg, #1B3A4B, #2D6A7A)', borderRight: '1px solid #E5E5E0' }}
                    onClick={toggleSidebar}
                    title="Expand sidebar"
                >
                    <div className="py-3" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{'\u25B8'}</div>
                    <div style={{
                        writingMode: 'vertical-rl', textOrientation: 'mixed',
                        color: '#2DD4A8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em',
                    }}>
                        Scenarios
                    </div>
                </div>
            )}
            {!sidebarCollapsed && (
            <div className="w-72 flex flex-col overflow-hidden" style={{ background: '#FFFFFF', borderRight: '1px solid #E5E5E0' }}>
                <div className="px-4 py-3 flex items-center" style={{ background: 'linear-gradient(135deg, #1B3A4B, #2D6A7A)' }}>
                    <div className="flex-1">
                        <h2 className="text-sm font-bold tracking-wide" style={{ color: '#2DD4A8' }}>Scenarios</h2>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                            {scenarios.length} items
                        </p>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleSidebar(); }}
                        className="flex items-center justify-center"
                        style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', width: '24px', height: '24px', borderRadius: '4px' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                        title="Collapse sidebar"
                    >
                        {'\u25C2'}
                    </button>
                </div>
                <div className="px-3 py-2.5" style={{ borderBottom: '1px solid #E5E5E0' }}>
                    <input
                        type="text"
                        placeholder="Search scenarios..."
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
                                        onClick={() => selectElement(el.id)}
                                    >
                                        <span className="truncate">{el.name}</span>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                    {groups.length === 0 && (
                        <div className="px-4 py-8 text-center" style={{ color: '#9CA3AF' }}>
                            No scenarios found. Create Scenario, UseCase, or UserActivity elements in your .sysml files.
                        </div>
                    )}
                </div>
            </div>
            )}

            {/* Center: Scenario detail / editor */}
            <div className="flex-1 overflow-y-auto p-6" style={{ background: '#F7F7F5' }}>
                {!selectedElement && (
                    <div className="flex items-center justify-center h-full" style={{ color: '#9CA3AF' }}>
                        <div className="text-center">
                            <div className="text-lg mb-2">{'\u25B6'}</div>
                            <div className="text-sm">Select a scenario to view its steps and linked elements</div>
                            <div className="text-xs mt-2" style={{ color: '#D1D5DB' }}>
                                Text-driven scenario editor coming soon
                            </div>
                        </div>
                    </div>
                )}
                {selectedElement && (
                    <div className="max-w-2xl">
                        <h2 className="text-lg font-semibold mb-2" style={{ color: '#1a1a1a' }}>{selectedElement.name}</h2>
                        <div className="flex gap-2 mb-4">
                            <span className="px-2 py-0.5 text-xs rounded-md font-medium"
                                style={{ background: '#E67E2218', color: '#E67E22' }}>
                                {selectedElement.kind}
                            </span>
                            <span className="px-2 py-0.5 text-xs rounded-md" style={{ background: '#F0F0ED', color: '#6B7280' }}>
                                {selectedElement.construct}
                            </span>
                        </div>
                        {selectedElement.doc && (
                            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', color: '#374151' }}>
                                {selectedElement.doc}
                            </div>
                        )}
                        {/* Linked elements */}
                        {model && (() => {
                            const rels = model.relationships.filter(r => r.sourceId === selectedElement.id || r.targetId === selectedElement.id);
                            if (rels.length === 0) return null;
                            return (
                                <div>
                                    <h3 className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>Linked Elements</h3>
                                    <div className="space-y-1">
                                        {rels.map(rel => {
                                            const otherId = rel.sourceId === selectedElement.id ? rel.targetId : rel.sourceId;
                                            const other = model.elements[otherId];
                                            return (
                                                <div
                                                    key={rel.id}
                                                    className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg cursor-pointer"
                                                    style={{ background: '#FFFFFF', border: '1px solid #E5E5E0' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = '#F0F0ED')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
                                                    onClick={() => selectElement(otherId)}
                                                >
                                                    <span style={{ color: '#2563EB' }}>{rel.type}</span>
                                                    <span style={{ color: '#374151' }}>{other?.name || otherId}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}
                        <div className="mt-4 text-xs" style={{ color: '#D1D5DB' }}>{selectedElement.file}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
