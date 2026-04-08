import { useState, useCallback, useEffect } from 'react';
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

    // Sync draft when value changes externally
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
            {/* Header */}
            <div className="p-4" style={{ ...sectionStyle, borderLeft: `3px solid ${meta?.color || '#6B7280'}` }}>
                <div className="text-sm font-semibold truncate" style={{ color: '#1a1a1a' }}>
                    {diagram.name}
                </div>
                <div className="flex items-center gap-2 text-xs mt-1.5">
                    {meta && (
                        <span className="px-2 py-0.5 rounded-md font-medium"
                            style={{ background: meta.color + '18', color: meta.color }}>
                            {meta.code}
                        </span>
                    )}
                    <span style={{ color: '#6B7280' }}>{meta?.fullName || diagram.diagramType}</span>
                </div>
                {diagram.auto && (
                    <div className="text-xs mt-1" style={{ color: '#6B7280' }}>Auto-generated</div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                {diagram.description && (
                    <div className="p-4" style={sectionStyle}>
                        <div className="text-xs font-medium mb-1.5" style={{ color: '#6B7280' }}>Description</div>
                        <div className="text-xs leading-relaxed" style={{ color: '#374151' }}>
                            {diagram.description}
                        </div>
                    </div>
                )}

                <div className="p-4" style={sectionStyle}>
                    <div className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>Details</div>
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
                </div>

                {diagram.properties && Object.keys(diagram.properties).length > 0 && (
                    <div className="p-4" style={sectionStyle}>
                        <div className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>Properties</div>
                        <div className="space-y-1.5">
                            {Object.entries(diagram.properties).map(([key, value]) => (
                                <div key={key} className="flex text-xs">
                                    <span className="min-w-[80px]" style={{ color: '#6B7280' }}>{key}</span>
                                    <span className="truncate" style={{ color: '#1a1a1a' }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {diagram.elementIds && diagram.elementIds.length > 0 && (
                    <div className="p-4" style={sectionStyle}>
                        <div className="text-xs font-medium mb-1.5" style={{ color: '#6B7280' }}>
                            Scoped Elements ({diagram.elementIds.length})
                        </div>
                        <div className="text-xs" style={{ color: '#6B7280' }}>
                            {diagram.elementIds.join(', ')}
                        </div>
                    </div>
                )}

                {diagram.relationshipTypes && diagram.relationshipTypes.length > 0 && (
                    <div className="p-4">
                        <div className="text-xs font-medium mb-1.5" style={{ color: '#6B7280' }}>
                            Relationship Types
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {diagram.relationshipTypes.map(rt => (
                                <span key={rt} className="px-1.5 py-0.5 rounded text-xs"
                                    style={{ background: '#EFF6FF', color: '#2563EB', fontSize: FONT.xs }}>
                                    {rt}
                                </span>
                            ))}
                        </div>
                    </div>
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

    // Reset edit mode when element selection changes
    useEffect(() => { setAttrEditMode(false); }, [selectedElementId]);

    // Ctrl+S / Cmd+S saves pending edits
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

    if (!selectedElementId || !model) return null;

    const element = model.elements[selectedElementId];
    if (!element) return null;

    const relationships = getRelationshipsForElement(model, selectedElementId);
    const outgoing = relationships.filter(r => r.sourceId === selectedElementId);
    const incoming = relationships.filter(r => r.targetId === selectedElementId);
    const layerColor = LAYER_COLORS[element.layer] || '#666';

    const violations = validation?.violations.filter(
        v => v.elementId === selectedElementId
    ) || [];

    const attrs = Object.entries(element.attributes).filter(([k]) => k !== 'name');
    const sectionStyle = { borderBottom: '1px solid #EDEDEA' };

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
            {/* Header with layer color accent */}
            <div className="p-4" style={{ ...sectionStyle, borderLeft: `3px solid ${layerColor}` }}>
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold truncate" style={{ color: '#1a1a1a' }}>
                        {element.name}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-md font-medium" style={{ background: layerColor + '18', color: layerColor }}>
                        {element.kind}
                    </span>
                    <span style={{ color: '#6B7280' }}>{element.construct}</span>
                </div>
                <div className="text-xs mt-1.5 capitalize" style={{ color: '#6B7280' }}>
                    {element.layer} layer
                </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
                {/* Doc — editable */}
                <div className="p-4" style={sectionStyle}>
                    <div className="text-xs font-medium mb-1.5" style={{ color: '#6B7280' }}>Description</div>
                    <div className="text-xs leading-relaxed">
                        <EditableField
                            value={element.doc || ''}
                            onSave={handleDocSave}
                            multiline
                        />
                    </div>
                </div>

                {/* Action Parameters */}
                {element.parameters && element.parameters.length > 0 && (
                    <div className="p-4" style={sectionStyle}>
                        <div className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>Parameters</div>
                        <div className="space-y-1.5">
                            {element.parameters.map((param: any) => (
                                <div key={param.name} className="flex items-center gap-2 text-xs">
                                    <span className="px-1.5 py-0.5 rounded font-mono"
                                        style={{
                                            fontSize: '10px',
                                            background: param.direction === 'in' ? '#EFF6FF' : param.direction === 'out' ? '#FFF7ED' : '#F0FDF4',
                                            color: param.direction === 'in' ? '#2563EB' : param.direction === 'out' ? '#EA580C' : '#16A34A',
                                        }}>
                                        {param.direction}
                                    </span>
                                    <span style={{ color: '#374151', fontWeight: 500 }}>{param.name}</span>
                                    <span style={{ color: '#6B7280' }}>:</span>
                                    <span style={{ color: '#6B7280' }}>{param.type}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Allocation target */}
                {element.allocatedTo && (
                    <div className="p-4" style={sectionStyle}>
                        <div className="text-xs font-medium mb-1.5" style={{ color: '#6B7280' }}>Allocated To</div>
                        <div
                            className="text-xs cursor-pointer px-2 py-1 rounded-md transition-colors"
                            style={{ color: '#E67E22' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#FFF7ED')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            onClick={() => selectElement(element.allocatedTo!)}
                        >
                            {'\u2192'} {model.elements[element.allocatedTo]?.name || element.allocatedTo}
                        </div>
                    </div>
                )}

                {/* Attributes — with inline editing (#19) */}
                {attrs.length > 0 && (
                    <div className="p-4" style={sectionStyle}>
                        <div className="flex items-center mb-2">
                            <span className="text-xs font-medium flex-1" style={{ color: '#6B7280' }}>Attributes</span>
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
                        </div>
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
                    </div>
                )}

                {/* Relationships */}
                {relationships.length > 0 && (
                    <div className="p-4" style={sectionStyle}>
                        <div className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>
                            Relationships ({relationships.length})
                        </div>
                        <div className="space-y-1">
                            {outgoing.map(rel => {
                                const target = model.elements[rel.targetId];
                                const tColor = target ? (LAYER_COLORS[target.layer] || '#666') : '#666';
                                return (
                                    <div
                                        key={rel.id}
                                        className="flex items-center gap-1.5 text-xs cursor-pointer rounded-md px-2 py-1 transition-colors"
                                        onMouseEnter={e => (e.currentTarget.style.background = '#F0F0ED')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        onClick={() => selectElement(rel.targetId)}
                                    >
                                        <span style={{ color: '#6B7280' }}>&rarr;</span>
                                        <span className="px-1 py-0.5 rounded" style={{ color: '#2563EB', background: '#EFF6FF', fontSize: FONT.xs }}>
                                            {rel.type}
                                        </span>
                                        <span className="truncate" style={{ color: '#374151' }}>
                                            {target?.name || rel.targetId}
                                        </span>
                                        {target && (
                                            <span className="ml-auto flex-shrink-0 px-1 py-0.5 rounded"
                                                style={{ background: tColor + '15', color: tColor, fontSize: FONT.badge }}>
                                                {target.kind}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                            {incoming.map(rel => {
                                const source = model.elements[rel.sourceId];
                                const sColor = source ? (LAYER_COLORS[source.layer] || '#666') : '#666';
                                return (
                                    <div
                                        key={rel.id}
                                        className="flex items-center gap-1.5 text-xs cursor-pointer rounded-md px-2 py-1 transition-colors"
                                        onMouseEnter={e => (e.currentTarget.style.background = '#F0F0ED')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        onClick={() => selectElement(rel.sourceId)}
                                    >
                                        <span style={{ color: '#6B7280' }}>&larr;</span>
                                        <span className="px-1 py-0.5 rounded" style={{ color: '#10B981', background: '#ECFDF5', fontSize: FONT.xs }}>
                                            {rel.type}
                                        </span>
                                        <span className="truncate" style={{ color: '#374151' }}>
                                            {source?.name || rel.sourceId}
                                        </span>
                                        {source && (
                                            <span className="ml-auto flex-shrink-0 px-1 py-0.5 rounded"
                                                style={{ background: sColor + '15', color: sColor, fontSize: FONT.badge }}>
                                                {source.kind}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Violations / Guidance */}
                {violations.length > 0 && (
                    <div className="p-4" style={sectionStyle}>
                        <div className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>Guidance</div>
                        <div className="space-y-2">
                            {violations.map((v, i) => (
                                <div
                                    key={`${v.ruleId}-${i}`}
                                    className="text-xs p-2.5 rounded-lg"
                                    style={{
                                        background: v.severity === 'error' ? '#FEF2F2'
                                            : v.severity === 'warning' ? '#FFFBEB' : '#EFF6FF',
                                        border: `1px solid ${
                                            v.severity === 'error' ? '#FECACA'
                                            : v.severity === 'warning' ? '#FDE68A' : '#BFDBFE'
                                        }`,
                                    }}
                                >
                                    <div style={{
                                        color: v.severity === 'error' ? '#DC2626'
                                            : v.severity === 'warning' ? '#D97706' : '#2563EB',
                                    }}>
                                        {v.description}
                                    </div>
                                    <div className="mt-0.5" style={{ color: '#6B7280' }}>[{v.ruleId}]</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Compliant indicator */}
                {violations.length === 0 && (
                    <div className="p-4">
                        <div className="text-xs flex items-center gap-1" style={{ color: '#10B981' }}>
                            <span>&#10003;</span> All rules satisfied
                        </div>
                    </div>
                )}

                {/* Source file (#38) */}
                {element.file && (
                    <div className="p-4" style={sectionStyle}>
                        <div className="text-xs font-medium mb-1.5" style={{ color: '#6B7280' }}>Source</div>
                        <button
                            className="flex items-center gap-1.5 text-xs w-full text-left rounded px-1 py-0.5 transition-colors"
                            style={{ color: '#2563EB', background: 'transparent', border: 'none', cursor: 'pointer', wordBreak: 'break-all' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            onClick={() => {
                                const text = element.line ? `${element.file}:${element.line}` : element.file!;
                                navigator.clipboard.writeText(text).catch(() => {});
                            }}
                            title="Click to copy path"
                        >
                            <span style={{ flexShrink: 0 }}>⟨/⟩</span>
                            <span className="font-mono truncate">
                                {element.file}{element.line ? `:${element.line}` : ''}
                            </span>
                            <span style={{ flexShrink: 0, color: '#9CA3AF', fontSize: '9px' }}>copy</span>
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

export function UnifiedPropertiesPanel() {
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const activeView = useModelStore(s => s.activeView);
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
                <div className="py-3" style={{ color: '#9CA3AF', fontSize: '14px' }}>{'\u25C2'}</div>
                <div style={{
                    writingMode: 'vertical-rl', textOrientation: 'mixed',
                    color: '#6B7280', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em',
                }}>
                    Properties
                </div>
            </div>
        );
    }

    const showDiagramProps = activeView.type === 'diagram' && !selectedElementId;
    const showElementProps = !!selectedElementId;

    return (
        <div className="flex flex-col overflow-hidden flex-shrink-0" style={{ width: '300px', background: '#FAFAF8', borderLeft: '1px solid #E5E5E0' }}>
            {/* Collapse button */}
            <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: '1px solid #EDEDEA' }}>
                <span className="text-xs font-medium" style={{ color: '#6B7280' }}>Properties</span>
                <button
                    onClick={togglePropertiesPanel}
                    className="flex items-center justify-center"
                    style={{ color: '#9CA3AF', fontSize: '12px', width: '20px', height: '20px', borderRadius: '4px' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#374151'}
                    onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}
                    title="Collapse properties"
                >
                    {'\u25B8'}
                </button>
            </div>

            {showElementProps ? (
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
