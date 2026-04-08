import { useModelStore, getRelationshipsForElement, getDiagram } from '../store/model-store';
import { LAYER_COLORS, DIAGRAM_TYPE_META } from '../constants';
import { FONT } from '../styles/tokens';
import { TraceabilityPanel } from './TraceabilityPanel';

function DiagramProperties() {
    const model = useModelStore(s => s.model);
    const selectedDiagramId = useModelStore(s => s.selectedDiagramId);
    const diagram = getDiagram(model, selectedDiagramId);

    if (!diagram) return null;

    const meta = DIAGRAM_TYPE_META[diagram.diagramType];
    const sectionStyle = { borderBottom: '1px solid #EDEDEA' };

    return (
        <div className="flex flex-col overflow-hidden flex-shrink-0" style={{ width: '300px', background: '#FAFAF8', borderLeft: '1px solid #E5E5E0' }}>
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
                    <span style={{ color: '#9CA3AF' }}>{meta?.fullName || diagram.diagramType}</span>
                </div>
                {diagram.auto && (
                    <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Auto-generated</div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Description */}
                {diagram.description && (
                    <div className="p-4" style={sectionStyle}>
                        <div className="text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Description</div>
                        <div className="text-xs leading-relaxed" style={{ color: '#374151' }}>
                            {diagram.description}
                        </div>
                    </div>
                )}

                {/* Metadata */}
                <div className="p-4" style={sectionStyle}>
                    <div className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>Details</div>
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

                {/* Custom properties */}
                {diagram.properties && Object.keys(diagram.properties).length > 0 && (
                    <div className="p-4" style={sectionStyle}>
                        <div className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>Properties</div>
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

                {/* Element IDs filter */}
                {diagram.elementIds && diagram.elementIds.length > 0 && (
                    <div className="p-4" style={sectionStyle}>
                        <div className="text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
                            Scoped Elements ({diagram.elementIds.length})
                        </div>
                        <div className="text-xs" style={{ color: '#6B7280' }}>
                            {diagram.elementIds.join(', ')}
                        </div>
                    </div>
                )}

                {/* Relationship types filter */}
                {diagram.relationshipTypes && diagram.relationshipTypes.length > 0 && (
                    <div className="p-4">
                        <div className="text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>
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
        </div>
    );
}

export function PropertiesPanel() {
    const model = useModelStore(s => s.model);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const selectedDiagramId = useModelStore(s => s.selectedDiagramId);
    const validation = useModelStore(s => s.validation);
    const selectElement = useModelStore(s => s.selectElement);

    // Show diagram properties when a diagram is selected and no element is selected
    if (selectedDiagramId && !selectedElementId) {
        return <DiagramProperties />;
    }

    if (!selectedElementId || !model) {
        return (
            <div className="p-4 flex items-center justify-center" style={{ width: '300px', background: '#FAFAF8', borderLeft: '1px solid #E5E5E0' }}>
                <span className="text-xs text-center" style={{ color: '#9CA3AF' }}>
                    Select an element or diagram to view properties
                </span>
            </div>
        );
    }

    const element = model.elements[selectedElementId];
    if (!element) {
        return (
            <div className="p-4" style={{ width: '300px', background: '#FAFAF8', borderLeft: '1px solid #E5E5E0' }}>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>Element not found</span>
            </div>
        );
    }

    const relationships = getRelationshipsForElement(model, selectedElementId);
    const outgoing = relationships.filter(r => r.sourceId === selectedElementId);
    const incoming = relationships.filter(r => r.targetId === selectedElementId);
    const layerColor = LAYER_COLORS[element.layer] || '#666';

    const violations = validation?.violations.filter(
        v => v.elementId === selectedElementId
    ) || [];

    const attrs = Object.entries(element.attributes).filter(
        ([k]) => k !== 'name'
    );

    const sectionStyle = { borderBottom: '1px solid #EDEDEA' };

    return (
        <div className="flex flex-col overflow-hidden flex-shrink-0" style={{ width: '300px', background: '#FAFAF8', borderLeft: '1px solid #E5E5E0' }}>
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
                    <span style={{ color: '#9CA3AF' }}>{element.construct}</span>
                </div>
                <div className="text-xs mt-1.5 capitalize" style={{ color: '#6B7280' }}>
                    {element.layer} layer
                </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
                {/* Doc */}
                {element.doc && (
                    <div className="p-4" style={sectionStyle}>
                        <div className="text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Description</div>
                        <div className="text-xs leading-relaxed" style={{ color: '#374151' }}>
                            {element.doc}
                        </div>
                    </div>
                )}

                {/* Action Parameters (for ActionDefinition elements) */}
                {element.parameters && element.parameters.length > 0 && (
                    <div className="p-4" style={sectionStyle}>
                        <div className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>Parameters</div>
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
                                    <span style={{ color: '#9CA3AF' }}>:</span>
                                    <span style={{ color: '#6B7280' }}>{param.type}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Allocation target */}
                {element.allocatedTo && (
                    <div className="p-4" style={sectionStyle}>
                        <div className="text-xs font-medium mb-1.5" style={{ color: '#9CA3AF' }}>Allocated To</div>
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

                {/* Attributes */}
                {attrs.length > 0 && (
                    <div className="p-4" style={sectionStyle}>
                        <div className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>Attributes</div>
                        <div className="space-y-1.5">
                            {attrs.map(([key, value]) => (
                                <div key={key} className="flex text-xs">
                                    <span className="min-w-[80px]" style={{ color: '#6B7280' }}>{key}</span>
                                    <span className="truncate" style={{ color: '#1a1a1a' }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Relationships — enhanced with element kind */}
                {relationships.length > 0 && (
                    <div className="p-4" style={sectionStyle}>
                        <div className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>
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
                                        <span style={{ color: '#9CA3AF' }}>&rarr;</span>
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
                                        <span style={{ color: '#9CA3AF' }}>&larr;</span>
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
                        <div className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>Guidance</div>
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
                                    <div className="mt-0.5" style={{ color: '#9CA3AF' }}>[{v.ruleId}]</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* No violations = compliant */}
                {violations.length === 0 && (
                    <div className="p-4">
                        <div className="text-xs flex items-center gap-1" style={{ color: '#10B981' }}>
                            <span>&#10003;</span> All rules satisfied
                        </div>
                    </div>
                )}

                {/* Traceability */}
                <TraceabilityPanel elementId={selectedElementId} />

                {/* Source file */}
                <div className="p-4 text-xs" style={{ color: '#D1D5DB' }}>
                    {element.file}
                </div>
            </div>
        </div>
    );
}
