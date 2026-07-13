import { useState, useCallback, useEffect, useMemo } from 'react';
import { useModelStore, getRelationshipsForElement, getDiagram } from '../store/model-store';
import { LAYER_COLORS, DIAGRAM_TYPE_META } from '../constants';
import { FONT } from '../styles/tokens';

// ─── Inline Editable Field ──────────────────────────────────────────────────

function EditableField({ value, onSave, multiline, forceEdit }: {
    value: string;
    onSave: (newValue: string) => void;
    multiline?: boolean;
    forceEdit?: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);

    useEffect(() => { setDraft(value); }, [value]);

    const handleSave = useCallback(() => {
        setEditing(false);
        if (draft !== value) onSave(draft);
    }, [draft, value, onSave]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) { handleSave(); }
        if (e.key === 'Escape') { setDraft(value); setEditing(false); }
    }, [handleSave, multiline, value]);

    if (!editing && !forceEdit) {
        return (
            <span
                className="cursor-pointer rounded px-1 py-0.5 transition-colors"
                style={{ color: '#1a1a1a' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => { setDraft(value); setEditing(true); }}
                title="Click to edit"
            >
                {value || <span style={{ color: '#D1D5DB', fontStyle: 'italic' }}>empty</span>}
            </span>
        );
    }

    if (multiline) {
        return (
            <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                autoFocus
                className="w-full px-2 py-1 text-xs rounded focus:outline-none"
                style={{ border: '1px solid #2DD4A8', background: '#FAFAF8', color: '#1a1a1a', resize: 'vertical', minHeight: '48px' }}
            />
        );
    }

    return (
        <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full px-2 py-1 text-xs rounded focus:outline-none"
            style={{ border: '1px solid #2DD4A8', background: '#FAFAF8', color: '#1a1a1a' }}
        />
    );
}

// ─── Collapsible Section (mirrors ModelExplorer layer header) ──────────────

function Section({ title, count, defaultOpen = true, actions, children }: {
    title: string;
    count?: number;
    defaultOpen?: boolean;
    actions?: React.ReactNode;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div style={{ borderBottom: '1px solid #EDEDEA' }}>
            <div
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors"
                style={{ borderRadius: '6px', margin: '2px 4px' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F0F0ED')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => setOpen(o => !o)}
            >
                <span className="font-medium flex-1 text-xs" style={{ color: '#374151' }}>{title}</span>
                {actions && <span onClick={e => e.stopPropagation()}>{actions}</span>}
                {typeof count === 'number' && <span className="text-xs" style={{ color: '#9CA3AF' }}>{count}</span>}
                <span style={{ color: '#D1D5DB' }}>{open ? '▾' : '▸'}</span>
            </div>
            {open && <div className="px-4 pb-3">{children}</div>}
        </div>
    );
}

// ─── Tree row (mirrors ModelExplorer element row) ──────────────────────────

function TreeRow({ label, kind, kindColor, onClick, arrow, typeBadge, typeColor, selected }: {
    label: string;
    kind?: string;
    kindColor?: string;
    onClick?: () => void;
    arrow?: '→' | '←';
    typeBadge?: string;
    typeColor?: string;
    selected?: boolean;
}) {
    return (
        <div
            className="flex items-center gap-1.5 cursor-pointer transition-colors ml-2"
            style={{
                borderRadius: '6px',
                padding: '4px 8px',
                background: selected ? '#2DD4A818' : 'transparent',
                color: selected ? '#1B3A4B' : '#374151',
                fontWeight: selected ? 500 : 400,
                fontSize: FONT.xs,
            }}
            onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#F0F0ED'; }}
            onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
            onClick={onClick}
        >
            {arrow && <span style={{ color: '#9CA3AF' }}>{arrow}</span>}
            {typeBadge && (
                <span className="px-1 py-0.5 rounded" style={{
                    background: (typeColor || '#2563EB') + '18',
                    color: typeColor || '#2563EB',
                    fontSize: FONT.xs,
                }}>{typeBadge}</span>
            )}
            <span className="truncate">{label}</span>
            {kind && (
                <span className="ml-auto flex-shrink-0 px-1 py-0.5 rounded" style={{
                    background: (kindColor || '#666') + '15',
                    color: kindColor || '#666',
                    fontSize: FONT.badge,
                }}>{kind}</span>
            )}
        </div>
    );
}

// ─── Diagram Properties ─────────────────────────────────────────────────────

function DiagramProperties() {
    const model = useModelStore(s => s.model);
    const activeView = useModelStore(s => s.activeView);
    const diagramId = activeView.type === 'diagram' ? activeView.diagramId : null;
    const diagram = getDiagram(model, diagramId);

    if (!diagram) return null;

    const meta = DIAGRAM_TYPE_META[diagram.diagramType];
    const sectionStyle = { borderBottom: '1px solid #EDEDEA' };

    return (
        <>
            <div className="p-4" style={{ ...sectionStyle, borderLeft: `3px solid ${meta?.color || '#6B7280'}` }}>
                <div className="text-sm font-semibold truncate" style={{ color: '#1a1a1a' }}>{diagram.name}</div>
                <div className="flex items-center gap-2 text-xs mt-1.5">
                    {meta && (
                        <span className="px-2 py-0.5 rounded-md font-medium"
                            style={{ background: meta.color + '18', color: meta.color }}>
                            {meta.code}
                        </span>
                    )}
                    <span style={{ color: '#6B7280' }}>{meta?.fullName || diagram.diagramType}</span>
                </div>
                {diagram.auto && <div className="text-xs mt-1" style={{ color: '#6B7280' }}>Auto-generated</div>}
            </div>

            <div className="flex-1 overflow-y-auto">
                {diagram.description && (
                    <Section title="Description" defaultOpen>
                        <div className="text-xs leading-relaxed" style={{ color: '#374151' }}>{diagram.description}</div>
                    </Section>
                )}

                <Section title="Details" defaultOpen>
                    <div className="space-y-1.5">
                        <div className="flex text-xs">
                            <span className="min-w-[80px]" style={{ color: '#6B7280' }}>ID</span>
                            <span className="truncate font-mono" style={{ color: '#1a1a1a', fontSize: FONT.xs }}>{diagram.id}</span>
                        </div>
                        <div className="flex text-xs">
                            <span className="min-w-[80px]" style={{ color: '#6B7280' }}>Viewpoint</span>
                            <span style={{ color: '#1a1a1a' }}>{diagram.viewpointId}</span>
                        </div>
                        <div className="flex text-xs">
                            <span className="min-w-[80px]" style={{ color: '#6B7280' }}>Type</span>
                            <span style={{ color: '#1a1a1a' }}>{diagram.diagramType}</span>
                        </div>
                    </div>
                </Section>

                {diagram.properties && Object.keys(diagram.properties).length > 0 && (
                    <Section title="Properties" count={Object.keys(diagram.properties).length}>
                        <div className="space-y-1.5">
                            {Object.entries(diagram.properties).map(([key, value]) => (
                                <div key={key} className="flex text-xs">
                                    <span className="min-w-[80px]" style={{ color: '#6B7280' }}>{key}</span>
                                    <span className="truncate" style={{ color: '#1a1a1a' }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {diagram.elementIds && diagram.elementIds.length > 0 && (
                    <Section title="Scoped Elements" count={diagram.elementIds.length} defaultOpen={false}>
                        <div className="text-xs" style={{ color: '#6B7280' }}>{diagram.elementIds.join(', ')}</div>
                    </Section>
                )}

                {diagram.relationshipTypes && diagram.relationshipTypes.length > 0 && (
                    <Section title="Relationship Types" count={diagram.relationshipTypes.length}>
                        <div className="flex flex-wrap gap-1">
                            {diagram.relationshipTypes.map(rt => (
                                <span key={rt} className="px-1.5 py-0.5 rounded text-xs"
                                    style={{ background: '#EFF6FF', color: '#2563EB', fontSize: FONT.xs }}>
                                    {rt}
                                </span>
                            ))}
                        </div>
                    </Section>
                )}
            </div>
        </>
    );
}

// ─── Element Properties ─────────────────────────────────────────────────────

function ElementProperties() {
    const model = useModelStore(s => s.model);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const validation = useModelStore(s => s.validation);
    const selectElement = useModelStore(s => s.selectElement);
    const updateElementField = useModelStore(s => s.updateElementField);
    const updateElementAttribute = useModelStore(s => s.updateElementAttribute);
    const applyEdit = useModelStore(s => s.applyEdit);

    const [attrEditMode, setAttrEditMode] = useState(false);

    useEffect(() => { setAttrEditMode(false); }, [selectedElementId]);

    useEffect(() => {
        if (!selectedElementId) return;
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                applyEdit(selectedElementId);
                setAttrEditMode(false);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [selectedElementId, applyEdit]);

    const relationships = useMemo(
        () => selectedElementId && model ? getRelationshipsForElement(model, selectedElementId) : [],
        [model, selectedElementId],
    );

    if (!selectedElementId || !model) return null;

    const element = model.elements[selectedElementId];
    if (!element) return null;

    const outgoing = relationships.filter(r => r.sourceId === selectedElementId);
    const incoming = relationships.filter(r => r.targetId === selectedElementId);
    const layerColor = LAYER_COLORS[element.layer] || '#666';

    const violations = validation?.violations.filter(v => v.elementId === selectedElementId) || [];
    const attrs = Object.entries(element.attributes).filter(([k]) => k !== 'name');

    const handleDocSave = (newDoc: string) => {
        updateElementField(selectedElementId, 'doc', newDoc);
        applyEdit(selectedElementId);
    };

    const handleAttrSave = (key: string, newValue: string) => {
        updateElementAttribute(selectedElementId, key, newValue);
        applyEdit(selectedElementId);
    };

    return (
        <>
            {/* Header mirrors ModelExplorer layer header (color chip + name + kind badge) */}
            <div className="p-4" style={{ borderBottom: '1px solid #EDEDEA', borderLeft: `3px solid ${layerColor}` }}>
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2.5 h-2.5 flex-shrink-0" style={{ background: layerColor, borderRadius: '3px' }} />
                    <span className="text-sm font-semibold truncate" style={{ color: '#1a1a1a' }}>{element.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-md font-medium" style={{ background: layerColor + '18', color: layerColor }}>
                        {element.kind}
                    </span>
                    <span style={{ color: '#6B7280' }}>{element.construct}</span>
                </div>
                <div className="text-xs mt-1.5 capitalize" style={{ color: '#6B7280' }}>{element.layer} layer</div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <Section title="Description" defaultOpen>
                    <div className="text-xs leading-relaxed">
                        <EditableField value={element.doc || ''} onSave={handleDocSave} multiline />
                    </div>
                </Section>

                {element.parameters && element.parameters.length > 0 && (
                    <Section title="Parameters" count={element.parameters.length}>
                        <div className="space-y-1.5">
                            {element.parameters.map((param: any) => (
                                <div key={param.name} className="flex items-center gap-2 text-xs">
                                    <span className="px-1.5 py-0.5 rounded font-mono" style={{
                                        fontSize: '10px',
                                        background: param.direction === 'in' ? '#EFF6FF' : param.direction === 'out' ? '#FFF7ED' : '#F0FDF4',
                                        color: param.direction === 'in' ? '#2563EB' : param.direction === 'out' ? '#EA580C' : '#16A34A',
                                    }}>{param.direction}</span>
                                    <span style={{ color: '#374151', fontWeight: 500 }}>{param.name}</span>
                                    <span style={{ color: '#6B7280' }}>:</span>
                                    <span style={{ color: '#6B7280' }}>{param.type}</span>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {element.allocatedTo && (
                    <Section title="Allocated To" defaultOpen>
                        <TreeRow
                            label={model.elements[element.allocatedTo]?.name || element.allocatedTo}
                            kind={model.elements[element.allocatedTo]?.kind}
                            kindColor="#E67E22"
                            arrow="→"
                            onClick={() => selectElement(element.allocatedTo!)}
                        />
                    </Section>
                )}

                {attrs.length > 0 && (
                    <Section
                        title="Attributes"
                        count={attrs.length}
                        defaultOpen
                        actions={
                            <button
                                onClick={() => {
                                    if (attrEditMode && selectedElementId) applyEdit(selectedElementId);
                                    setAttrEditMode(m => !m);
                                }}
                                className="px-2 py-0.5 rounded text-xs font-medium"
                                style={{
                                    background: attrEditMode ? '#2DD4A8' : '#F0F0ED',
                                    color: attrEditMode ? '#FFFFFF' : '#6B7280',
                                    border: 'none', cursor: 'pointer',
                                }}
                                title={attrEditMode ? 'Save (Ctrl+S)' : 'Edit attributes'}
                            >
                                {attrEditMode ? '✓ Save' : '✏ Edit'}
                            </button>
                        }
                    >
                        <div className="space-y-1.5">
                            {attrs.map(([key, value]) => (
                                <div key={key} className="flex text-xs items-start">
                                    <span className="min-w-[80px] pt-0.5" style={{ color: '#6B7280' }}>{key}</span>
                                    <EditableField
                                        value={value}
                                        onSave={(newVal) => handleAttrSave(key, newVal)}
                                        forceEdit={attrEditMode}
                                    />
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {outgoing.length > 0 && (
                    <Section title="Outgoing" count={outgoing.length} defaultOpen>
                        {outgoing.map(rel => {
                            const target = model.elements[rel.targetId];
                            const tColor = target ? (LAYER_COLORS[target.layer] || '#666') : '#666';
                            return (
                                <TreeRow
                                    key={rel.id}
                                    label={target?.name || rel.targetId}
                                    kind={target?.kind}
                                    kindColor={tColor}
                                    arrow="→"
                                    typeBadge={rel.type}
                                    typeColor="#2563EB"
                                    onClick={() => selectElement(rel.targetId)}
                                />
                            );
                        })}
                    </Section>
                )}

                {incoming.length > 0 && (
                    <Section title="Incoming" count={incoming.length} defaultOpen>
                        {incoming.map(rel => {
                            const source = model.elements[rel.sourceId];
                            const sColor = source ? (LAYER_COLORS[source.layer] || '#666') : '#666';
                            return (
                                <TreeRow
                                    key={rel.id}
                                    label={source?.name || rel.sourceId}
                                    kind={source?.kind}
                                    kindColor={sColor}
                                    arrow="←"
                                    typeBadge={rel.type}
                                    typeColor="#10B981"
                                    onClick={() => selectElement(rel.sourceId)}
                                />
                            );
                        })}
                    </Section>
                )}

                {violations.length > 0 && (
                    <Section title="Guidance" count={violations.length} defaultOpen>
                        <div className="space-y-2">
                            {violations.map((v, i) => (
                                <div
                                    key={`${v.ruleId}-${i}`}
                                    className="text-xs p-2.5 rounded-lg"
                                    style={{
                                        background: v.severity === 'error' ? '#FEF2F2' : v.severity === 'warning' ? '#FFFBEB' : '#EFF6FF',
                                        border: `1px solid ${v.severity === 'error' ? '#FECACA' : v.severity === 'warning' ? '#FDE68A' : '#BFDBFE'}`,
                                    }}
                                >
                                    <div style={{ color: v.severity === 'error' ? '#DC2626' : v.severity === 'warning' ? '#D97706' : '#2563EB' }}>
                                        {v.description}
                                    </div>
                                    <div className="mt-0.5" style={{ color: '#6B7280' }}>[{v.ruleId}]</div>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {violations.length === 0 && (
                    <div className="p-4">
                        <div className="text-xs flex items-center gap-1" style={{ color: '#10B981' }}>
                            <span>&#10003;</span> All rules satisfied
                        </div>
                    </div>
                )}

                {element.file && (
                    <Section title="Source" defaultOpen={false}>
                        <button
                            className="flex items-center gap-1.5 text-xs w-full text-left rounded px-1 py-0.5 transition-colors"
                            style={{ color: '#2563EB', background: 'transparent', border: 'none', cursor: 'pointer', wordBreak: 'break-all' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            onClick={() => {
                                navigator.clipboard.writeText(element.file!).catch(() => {});
                            }}
                            title="Click to copy path"
                        >
                            <span style={{ flexShrink: 0 }}>⟨/⟩</span>
                            <span className="font-mono truncate">
                                {element.file}
                            </span>
                            <span style={{ flexShrink: 0, color: '#9CA3AF', fontSize: '9px' }}>copy</span>
                        </button>
                    </Section>
                )}
            </div>
        </>
    );
}

function RelationshipProperties() {
    const model = useModelStore(s => s.model);
    const relationshipId = useModelStore(s => s.selectedRelationshipId);
    if (!model || !relationshipId) return null;
    const relationship = model.relationships.find(rel => rel.id === relationshipId);
    if (!relationship) return null;
    const source = model.elements[relationship.sourceId];
    const target = model.elements[relationship.targetId];
    const isFlow = relationship.type === 'flow';
    const item = relationship.flowItem;
    const category = item && /energy|power|voltage|current/i.test(item) ? 'Energy'
        : item && /material|fluid|gas|batch/i.test(item) ? 'Material'
        : isFlow ? 'Data' : 'Control';
    const categoryColor = category === 'Energy' ? '#D97706'
        : category === 'Material' ? '#16A34A'
        : category === 'Data' ? '#3498DB'
        : '#4B5563';
    return (
        <>
            <div className="p-4" style={{ borderBottom: '1px solid #EDEDEA', borderLeft: `3px solid ${categoryColor}` }}>
                <div className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>Connection</div>
                <div className="mt-1 text-xs" style={{ color: '#6B7280' }}>{source?.name ?? relationship.sourceId} → {target?.name ?? relationship.targetId}</div>
                <div className="mt-2 flex gap-2">
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: categoryColor + '18', color: categoryColor }}>{category} flow</span>
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: '#F3F4F6', color: '#374151' }}>{relationship.type}</span>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                <Section title="Involved item" defaultOpen>
                    <div className="text-xs" style={{ color: '#374151' }}>{item ?? 'No transported item is modeled for this connection.'}</div>
                </Section>
                <Section title="Endpoints" defaultOpen>
                    <div className="space-y-2 text-xs">
                        <div><span style={{ color: '#6B7280' }}>Source</span><div style={{ color: '#1a1a1a', fontWeight: 500 }}>{source?.name ?? relationship.sourceId}</div></div>
                        <div><span style={{ color: '#6B7280' }}>Target</span><div style={{ color: '#1a1a1a', fontWeight: 500 }}>{target?.name ?? relationship.targetId}</div></div>
                    </div>
                </Section>
                <Section title="Traceability" defaultOpen={false}>
                    <div className="text-xs" style={{ color: '#6B7280' }}>{relationship.file || 'Model relationship'}</div>
                </Section>
            </div>
        </>
    );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

export function UnifiedPropertiesPanel() {
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const activeView = useModelStore(s => s.activeView);
    const selectedRelationshipId = useModelStore(s => s.selectedRelationshipId);
    const propertiesPanelCollapsed = useModelStore(s => s.propertiesPanelCollapsed);
    const togglePropertiesPanel = useModelStore(s => s.togglePropertiesPanel);

    if (propertiesPanelCollapsed) {
        return (
            <div
                className="flex flex-col items-center flex-shrink-0 cursor-pointer"
                style={{ width: '40px', background: '#FAFAF8', borderLeft: '1px solid #E5E5E0' }}
                onClick={togglePropertiesPanel}
                title="Expand properties"
            >
                <div className="flex items-center justify-center mt-2" style={{
                    color: '#6B7280', fontSize: '20px', width: '32px', height: '32px', borderRadius: '6px',
                }}>{'\u25C2'}</div>
                <div style={{
                    writingMode: 'vertical-rl', textOrientation: 'mixed',
                    color: '#6B7280', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em',
                }}>
                    Properties
                </div>
            </div>
        );
    }

    const showDiagramProps = activeView.type === 'diagram' && !selectedElementId && !selectedRelationshipId;
    const showElementProps = !!selectedElementId;

    return (
        <div className="flex flex-col overflow-hidden flex-shrink-0" style={{ width: '300px', background: '#FAFAF8', borderLeft: '1px solid #E5E5E0' }}>
            <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: '1px solid #EDEDEA' }}>
                <span className="text-xs font-medium" style={{ color: '#6B7280' }}>Properties</span>
                <button
                    onClick={togglePropertiesPanel}
                    className="flex items-center justify-center"
                    style={{
                        color: '#6B7280', fontSize: '20px', lineHeight: 1,
                        width: '32px', height: '32px', borderRadius: '6px',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#374151'}
                    onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}
                    title="Collapse properties"
                    aria-label="Collapse properties"
                >
                    {'\u25B8'}
                </button>
            </div>

            {selectedRelationshipId ? (
                <RelationshipProperties />
            ) : showElementProps ? (
                <ElementProperties />
            ) : showDiagramProps ? (
                <DiagramProperties />
            ) : (
                <div className="flex-1 flex items-center justify-center p-4">
                    <span className="text-xs text-center" style={{ color: '#6B7280' }}>
                        Select an element or diagram to view properties
                    </span>
                </div>
            )}
        </div>
    );
}
