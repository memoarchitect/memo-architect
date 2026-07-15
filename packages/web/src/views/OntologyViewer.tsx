import { useState, useMemo, lazy, Suspense } from 'react';
import { useModelStore, type GroupBy } from '../store/model-store';
import { LAYER_COLORS, LAYER_ORDER } from '../constants';

const CompletenessHints = lazy(() => import('./CompletenessHints').then(m => ({ default: m.CompletenessHints })));
const ExtensionBrowser = lazy(() => import('./ExtensionBrowser').then(m => ({ default: m.ExtensionBrowser })));

interface KindInfo {
    name: string;
    label: string;
    layer: string;
    construct: string;
    defaultAttributes?: Record<string, string>;
}

interface RelInfo {
    name: string;
    label: string;
    layer: string;
    color: string;
}

const GROUP_OPTIONS: { id: GroupBy; label: string }[] = [
    { id: 'layer', label: 'Layer' },
    { id: 'construct', label: 'Construct' },
    { id: 'source', label: 'Source' },
];

export function OntologyViewer() {
    const model = useModelStore(s => s.model);
    const groupBy = useModelStore(s => s.ontologyGroupBy);
    const setGroupBy = useModelStore(s => s.setOntologyGroupBy);
    const collapsedGroups = useModelStore(s => s.collapsedGroups);
    const toggleGroupCollapsed = useModelStore(s => s.toggleGroupCollapsed);
    const hiddenLayers = useModelStore(s => s.hiddenLayers);
    const toggleLayerVisibility = useModelStore(s => s.toggleLayerVisibility);
    const sidebarCollapsed = useModelStore(s => s.sidebarCollapsed);
    const toggleSidebar = useModelStore(s => s.toggleSidebar);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedKind, setSelectedKind] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'graph' | 'tree' | 'completeness' | 'extensions'>('tree');

    // Extract kinds from model DTO config data
    const kinds = useMemo((): KindInfo[] => {
        if (!model) return [];
        // Build from architectureLayers + elements: infer available kinds from model elements
        const kindMap = new Map<string, KindInfo>();
        for (const el of Object.values(model.elements)) {
            if (!kindMap.has(el.kind)) {
                kindMap.set(el.kind, {
                    name: el.kind,
                    label: el.kind.replace(/([A-Z])/g, ' $1').trim(),
                    layer: el.layer,
                    construct: el.construct,
                });
            }
        }
        // Also get from viewpoints (kinds mentioned but maybe not instantiated)
        if (model.viewpoints) {
            for (const vp of model.viewpoints) {
                for (const k of vp.visibleKinds) {
                    if (!kindMap.has(k)) {
                        kindMap.set(k, {
                            name: k,
                            label: k.replace(/([A-Z])/g, ' $1').trim(),
                            layer: 'unknown',
                            construct: 'part def',
                        });
                    }
                }
            }
        }
        return [...kindMap.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [model]);

    const relationships = useMemo((): RelInfo[] => {
        if (!model) return [];
        // Infer from model relationships
        const relSet = new Map<string, RelInfo>();
        for (const rel of model.relationships) {
            if (!relSet.has(rel.type)) {
                relSet.set(rel.type, {
                    name: rel.type,
                    label: rel.type.replace(/([A-Z])/g, ' $1').trim(),
                    layer: 'logical',
                    color: '#6B7280',
                });
            }
        }
        return [...relSet.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [model]);

    const filteredKinds = useMemo(() => {
        if (!searchTerm) return kinds;
        const lower = searchTerm.toLowerCase();
        return kinds.filter(k =>
            k.name.toLowerCase().includes(lower) ||
            k.layer.toLowerCase().includes(lower) ||
            k.construct.toLowerCase().includes(lower)
        );
    }, [kinds, searchTerm]);

    // Group kinds
    const groups = useMemo(() => {
        const map = new Map<string, KindInfo[]>();
        for (const k of filteredKinds) {
            const key = groupBy === 'layer' ? k.layer
                : groupBy === 'construct' ? k.construct
                : 'base'; // source grouping placeholder
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(k);
        }
        const entries = [...map.entries()];
        if (groupBy === 'layer') {
            entries.sort((a, b) => {
                const ai = LAYER_ORDER.indexOf(a[0] as any);
                const bi = LAYER_ORDER.indexOf(b[0] as any);
                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
            });
        } else {
            entries.sort((a, b) => a[0].localeCompare(b[0]));
        }
        return entries;
    }, [filteredKinds, groupBy]);

    const selectedKindInfo = selectedKind ? kinds.find(k => k.name === selectedKind) : null;

    // Count elements of this kind
    const kindElementCount = useMemo(() => {
        if (!selectedKind || !model) return 0;
        return Object.values(model.elements).filter(e => e.kind === selectedKind).length;
    }, [selectedKind, model]);

    // Find viewpoints that include this kind
    const kindViewpoints = useMemo(() => {
        if (!selectedKind || !model?.viewpoints) return [];
        return model.viewpoints.filter(vp => vp.visibleKinds.includes(selectedKind));
    }, [selectedKind, model?.viewpoints]);

    // Find closure rules that reference this kind
    const kindRuleCount = useMemo(() => {
        // We don't have closure rules in the DTO currently, so return 0
        return 0;
    }, [selectedKind]);

    return (
        <div className="flex flex-1 overflow-hidden">
            {/* Left: Ontology tree */}
            {!sidebarCollapsed && (
            <div className="w-72 flex flex-col overflow-hidden" style={{ background: '#FFFFFF', borderRight: '1px solid #E5E5E0' }}>
                <div className="px-3 py-2.5" style={{ borderBottom: '1px solid #E5E5E0' }}>
                    <input
                        type="text"
                        placeholder="Search kinds..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                        style={{ background: '#F7F7F5', border: '1px solid #E5E5E0', color: '#1a1a1a' }}
                    />
                </div>
                <div className="px-3 py-1.5 flex items-center gap-1.5" style={{ borderBottom: '1px solid #E5E5E0' }}>
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>Group:</span>
                    {GROUP_OPTIONS.map(g => (
                        <button
                            key={g.id}
                            onClick={() => setGroupBy(g.id)}
                            className="px-2 py-0.5 text-xs rounded-md"
                            style={groupBy === g.id
                                ? { background: '#1B3A4B', color: '#2DD4A8' }
                                : { background: '#F0F0ED', color: '#6B7280' }}
                        >
                            {g.label}
                        </button>
                    ))}
                </div>
                <div className="flex-1 overflow-y-auto text-xs py-1">
                    {groups.map(([group, gKinds]) => {
                        const collapsed = collapsedGroups.has(group);
                        const isHidden = groupBy === 'layer' && hiddenLayers.has(group);
                        const color = groupBy === 'layer' ? (LAYER_COLORS[group] || '#666') : '#6B7280';
                        return (
                            <div key={group} className="mb-0.5">
                                <div
                                    className="flex items-center gap-2 px-3 py-1.5 cursor-pointer"
                                    style={{ borderRadius: '6px', margin: '0 4px', opacity: isHidden ? 0.4 : 1 }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#F0F0ED')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    onClick={() => toggleGroupCollapsed(group)}
                                >
                                    <span className="w-2.5 h-2.5 rounded flex-shrink-0" style={{ backgroundColor: color, borderRadius: '3px' }} />
                                    <span className="font-medium capitalize flex-1" style={{ color: '#374151' }}>{group}</span>
                                    {groupBy === 'layer' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(group); }}
                                            className="px-1 rounded"
                                            style={{ color: isHidden ? '#D1D5DB' : '#9CA3AF', fontSize: '10px' }}
                                            title={isHidden ? 'Show group' : 'Hide group'}
                                        >
                                            {isHidden ? '\u25CB' : '\u25CF'}
                                        </button>
                                    )}
                                    <span style={{ color: '#9CA3AF' }}>{gKinds.length}</span>
                                    <span style={{ color: '#D1D5DB' }}>{collapsed ? '\u25B8' : '\u25BE'}</span>
                                </div>
                                {!collapsed && !isHidden && gKinds.map(k => (
                                    <div
                                        key={k.name}
                                        className="px-3 py-1 ml-6 cursor-pointer flex items-center gap-1.5"
                                        style={{
                                            borderRadius: '6px',
                                            background: selectedKind === k.name ? '#2DD4A818' : 'transparent',
                                            color: selectedKind === k.name ? '#1B3A4B' : '#374151',
                                            fontWeight: selectedKind === k.name ? 500 : 400,
                                        }}
                                        onMouseEnter={e => { if (selectedKind !== k.name) e.currentTarget.style.background = '#F0F0ED'; }}
                                        onMouseLeave={e => { if (selectedKind !== k.name) e.currentTarget.style.background = 'transparent'; }}
                                        onClick={() => setSelectedKind(k.name)}
                                    >
                                        <span className="truncate">{k.name}</span>
                                        <span style={{ color: '#9CA3AF', fontSize: '10px' }}>{k.construct}</span>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
            )}

            {/* Center: Ontology graph or tree detail */}
            <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#F7F7F5' }}>
                {/* Tab bar */}
                <div className="flex items-center gap-1 px-4 py-2" style={{ borderBottom: '1px solid #E5E5E0', background: '#FFFFFF' }}>
                    <button
                        onClick={() => setActiveTab('tree')}
                        className="px-3 py-1 text-xs rounded-md"
                        style={activeTab === 'tree'
                            ? { background: '#1B3A4B', color: '#2DD4A8' }
                            : { background: '#F0F0ED', color: '#6B7280' }}
                    >
                        Tree View
                    </button>
                    <button
                        onClick={() => setActiveTab('graph')}
                        className="px-3 py-1 text-xs rounded-md"
                        style={activeTab === 'graph'
                            ? { background: '#1B3A4B', color: '#2DD4A8' }
                            : { background: '#F0F0ED', color: '#6B7280' }}
                    >
                        Graph View
                    </button>
                    <button
                        onClick={() => setActiveTab('completeness')}
                        className="px-3 py-1 text-xs rounded-md"
                        style={activeTab === 'completeness'
                            ? { background: '#1B3A4B', color: '#2DD4A8' }
                            : { background: '#F0F0ED', color: '#6B7280' }}
                    >
                        Completeness
                    </button>
                    <button
                        onClick={() => setActiveTab('extensions')}
                        className="px-3 py-1 text-xs rounded-md"
                        style={activeTab === 'extensions'
                            ? { background: '#1B3A4B', color: '#2DD4A8' }
                            : { background: '#F0F0ED', color: '#6B7280' }}
                    >
                        Extensions
                    </button>
                </div>

                {activeTab === 'tree' && (
                    <div className="flex-1 overflow-y-auto p-6">
                        {!selectedKindInfo && (
                            <div className="flex items-center justify-center h-full" style={{ color: '#9CA3AF' }}>
                                <div className="text-center">
                                    <div className="text-lg mb-2">{'\u25C9'}</div>
                                    <div className="text-sm">Select a kind from the tree to view its definition</div>
                                    <div className="text-xs mt-1">{kinds.length} kinds across {groups.length} groups</div>
                                </div>
                            </div>
                        )}
                        {selectedKindInfo && (
                            <div className="max-w-2xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="w-3 h-3 rounded" style={{ backgroundColor: LAYER_COLORS[selectedKindInfo.layer] || '#666' }} />
                                    <h2 className="text-lg font-semibold" style={{ color: '#1a1a1a' }}>{selectedKindInfo.name}</h2>
                                </div>
                                <div className="flex gap-2 mb-4">
                                    <span className="px-2 py-0.5 text-xs rounded-md font-medium"
                                        style={{ background: (LAYER_COLORS[selectedKindInfo.layer] || '#666') + '18', color: LAYER_COLORS[selectedKindInfo.layer] || '#666' }}>
                                        {selectedKindInfo.layer} layer
                                    </span>
                                    <span className="px-2 py-0.5 text-xs rounded-md" style={{ background: '#F0F0ED', color: '#6B7280' }}>
                                        {selectedKindInfo.construct}
                                    </span>
                                    <span className="px-2 py-0.5 text-xs rounded-md" style={{ background: '#F0F0ED', color: '#6B7280' }}>
                                        {kindElementCount} instances
                                    </span>
                                </div>

                                {/* Default attributes */}
                                {selectedKindInfo.defaultAttributes && Object.keys(selectedKindInfo.defaultAttributes).length > 0 && (
                                    <div className="mb-4">
                                        <h3 className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>Default Attributes</h3>
                                        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #E5E5E0' }}>
                                            {Object.entries(selectedKindInfo.defaultAttributes).map(([k, v]) => (
                                                <div key={k} className="flex px-3 py-1.5 text-xs" style={{ background: '#FFFFFF', borderBottom: '1px solid #F0F0ED' }}>
                                                    <span className="w-32 flex-shrink-0" style={{ color: '#6B7280' }}>{k}</span>
                                                    <span style={{ color: '#1a1a1a' }}>{v}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Viewpoints that include this kind */}
                                {kindViewpoints.length > 0 && (
                                    <div className="mb-4">
                                        <h3 className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>Viewpoints</h3>
                                        <div className="flex flex-wrap gap-1.5">
                                            {kindViewpoints.map(vp => (
                                                <span key={vp.id} className="px-2 py-0.5 text-xs rounded-full" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                                                    {vp.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* All instances of this kind */}
                                {model && kindElementCount > 0 && (
                                    <div className="mb-4">
                                        <h3 className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>Instances ({kindElementCount})</h3>
                                        <div className="space-y-1">
                                            {Object.values(model.elements)
                                                .filter(e => e.kind === selectedKind)
                                                .slice(0, 20)
                                                .map(el => (
                                                    <div key={el.id} className="text-xs px-3 py-1 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', color: '#374151' }}>
                                                        {el.name}
                                                    </div>
                                                ))}
                                            {kindElementCount > 20 && (
                                                <div className="text-xs px-3 py-1" style={{ color: '#9CA3AF' }}>
                                                    ...and {kindElementCount - 20} more
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'graph' && (
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                            {groups.filter(([g]) => !(groupBy === 'layer' && hiddenLayers.has(g))).map(([group, gKinds]) => {
                                const isGroupCollapsed = collapsedGroups.has(group);
                                const color = groupBy === 'layer' ? (LAYER_COLORS[group] || '#666') : '#6B7280';
                                return (
                                    <div
                                        key={group}
                                        className="rounded-xl overflow-hidden"
                                        style={{ border: `2px solid ${color}30`, background: '#FFFFFF' }}
                                    >
                                        <div
                                            className="flex items-center gap-2 px-4 py-2.5 cursor-pointer"
                                            style={{ background: `${color}10`, borderBottom: `1px solid ${color}20` }}
                                            onClick={() => toggleGroupCollapsed(group)}
                                        >
                                            <span className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                                            <span className="text-sm font-medium capitalize flex-1" style={{ color: '#1a1a1a' }}>{group}</span>
                                            <span className="text-xs" style={{ color: '#9CA3AF' }}>{gKinds.length} kinds</span>
                                            <span style={{ color: '#D1D5DB' }}>{isGroupCollapsed ? '\u25B8' : '\u25BE'}</span>
                                        </div>
                                        {!isGroupCollapsed && (
                                            <div className="p-2">
                                                {gKinds.map(k => (
                                                    <div
                                                        key={k.name}
                                                        className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-colors mb-0.5"
                                                        style={{
                                                            background: selectedKind === k.name ? `${color}15` : 'transparent',
                                                            border: selectedKind === k.name ? `1px solid ${color}30` : '1px solid transparent',
                                                        }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = `${color}08`)}
                                                        onMouseLeave={e => (e.currentTarget.style.background = selectedKind === k.name ? `${color}15` : 'transparent')}
                                                        onClick={() => setSelectedKind(k.name)}
                                                    >
                                                        <span className="font-medium" style={{ color: '#1a1a1a' }}>{k.name}</span>
                                                        <span style={{ color: '#9CA3AF' }}>{k.construct}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Relationships section */}
                        {relationships.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-sm font-medium mb-3" style={{ color: '#1a1a1a' }}>Relationship Types</h3>
                                <div className="flex flex-wrap gap-2">
                                    {relationships.map(r => (
                                        <span
                                            key={r.name}
                                            className="px-3 py-1 text-xs rounded-full"
                                            style={{ background: '#F0F0ED', color: '#374151', border: '1px solid #E5E5E0' }}
                                        >
                                            {r.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'completeness' && (
                    <Suspense fallback={<div className="p-6 text-sm" style={{ color: '#9CA3AF' }}>Loading...</div>}>
                        <CompletenessHints />
                    </Suspense>
                )}

                {activeTab === 'extensions' && (
                    <Suspense fallback={<div className="p-6 text-sm" style={{ color: '#9CA3AF' }}>Loading...</div>}>
                        <ExtensionBrowser />
                    </Suspense>
                )}
            </div>
        </div>
    );
}
