import { useModelStore, getRelationshipsForElement } from '../store/model-store';
import { LAYER_COLORS } from '../constants';

export function PropertiesPanel() {
    const model = useModelStore(s => s.model);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const validation = useModelStore(s => s.validation);
    const selectElement = useModelStore(s => s.selectElement);

    if (!selectedElementId || !model) {
        return (
            <div className="w-72 p-4 flex items-center justify-center" style={{ background: '#FAFAF8', borderLeft: '1px solid #E5E5E0' }}>
                <span className="text-xs text-center" style={{ color: '#9CA3AF' }}>
                    Select an element to view properties
                </span>
            </div>
        );
    }

    const element = model.elements[selectedElementId];
    if (!element) {
        return (
            <div className="w-72 p-4" style={{ background: '#FAFAF8', borderLeft: '1px solid #E5E5E0' }}>
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
        <div className="w-72 flex flex-col overflow-hidden" style={{ background: '#FAFAF8', borderLeft: '1px solid #E5E5E0' }}>
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

                {/* Relationships */}
                {relationships.length > 0 && (
                    <div className="p-4" style={sectionStyle}>
                        <div className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>
                            Relationships ({relationships.length})
                        </div>
                        <div className="space-y-1">
                            {outgoing.map(rel => {
                                const target = model.elements[rel.targetId];
                                return (
                                    <div
                                        key={rel.id}
                                        className="flex items-center gap-1.5 text-xs cursor-pointer rounded-md px-2 py-1 transition-colors"
                                        onMouseEnter={e => (e.currentTarget.style.background = '#F0F0ED')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        onClick={() => selectElement(rel.targetId)}
                                    >
                                        <span style={{ color: '#9CA3AF' }}>&rarr;</span>
                                        <span style={{ color: '#2563EB' }}>{rel.type}</span>
                                        <span className="truncate" style={{ color: '#374151' }}>
                                            {target?.name || rel.targetId}
                                        </span>
                                    </div>
                                );
                            })}
                            {incoming.map(rel => {
                                const source = model.elements[rel.sourceId];
                                return (
                                    <div
                                        key={rel.id}
                                        className="flex items-center gap-1.5 text-xs cursor-pointer rounded-md px-2 py-1 transition-colors"
                                        onMouseEnter={e => (e.currentTarget.style.background = '#F0F0ED')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        onClick={() => selectElement(rel.sourceId)}
                                    >
                                        <span style={{ color: '#9CA3AF' }}>&larr;</span>
                                        <span style={{ color: '#10B981' }}>{rel.type}</span>
                                        <span className="truncate" style={{ color: '#374151' }}>
                                            {source?.name || rel.sourceId}
                                        </span>
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

                {/* Source file */}
                <div className="p-4 text-xs" style={{ color: '#D1D5DB' }}>
                    {element.file}
                </div>
            </div>
        </div>
    );
}
