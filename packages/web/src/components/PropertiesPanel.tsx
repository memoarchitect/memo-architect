// ─── Properties Panel ─────────────────────────────────────────────────────────
//
// Shows details and guidance for the selected element. When an element is
// selected (via diagram click or sidebar), this panel displays:
//   - Element identity (name, kind, construct, layer)
//   - All attributes
//   - Relationships (incoming + outgoing)
//   - Validation violations with actionable guidance
// ─────────────────────────────────────────────────────────────────────────────

import { useModelStore, getRelationshipsForElement } from '../store/model-store';

const LAYER_COLORS: Record<string, string> = {
    business: '#8E44AD',
    requirements: '#4A90D9',
    risk: '#E74C3C',
    functional: '#E67E22',
    logical: '#7B68EE',
    physical: '#95A5A6',
    software: '#F39C12',
    interfaces: '#1ABC9C',
    verification: '#2ECC71',
    ui: '#3498DB',
};

export function PropertiesPanel() {
    const model = useModelStore(s => s.model);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const validation = useModelStore(s => s.validation);
    const selectElement = useModelStore(s => s.selectElement);

    if (!selectedElementId || !model) {
        return (
            <div className="w-64 bg-slate-800/50 border-l border-slate-700 p-4 flex items-center justify-center">
                <span className="text-xs text-slate-500 text-center">
                    Select an element to view properties
                </span>
            </div>
        );
    }

    const element = model.elements[selectedElementId];
    if (!element) {
        return (
            <div className="w-64 bg-slate-800/50 border-l border-slate-700 p-4">
                <span className="text-xs text-slate-500">Element not found</span>
            </div>
        );
    }

    const relationships = getRelationshipsForElement(model, selectedElementId);
    const outgoing = relationships.filter(r => r.sourceId === selectedElementId);
    const incoming = relationships.filter(r => r.targetId === selectedElementId);
    const layerColor = LAYER_COLORS[element.layer] || '#666';

    // Find violations for this element
    const violations = validation?.violations.filter(
        v => v.elementId === selectedElementId
    ) || [];

    const attrs = Object.entries(element.attributes).filter(
        ([k]) => k !== 'name'
    );

    return (
        <div className="w-64 bg-slate-800/50 border-l border-slate-700 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                    <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: layerColor }}
                    />
                    <span className="text-sm font-semibold text-slate-100 truncate">
                        {element.name}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="px-1.5 py-0.5 rounded bg-slate-700/60">{element.kind}</span>
                    <span className="text-slate-600">{element.construct}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                    {element.layer} layer
                </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
                {/* Doc */}
                {element.doc && (
                    <div className="p-3 border-b border-slate-700/50">
                        <div className="text-xs text-slate-500 mb-1">Description</div>
                        <div className="text-xs text-slate-300 leading-relaxed">
                            {element.doc}
                        </div>
                    </div>
                )}

                {/* Attributes */}
                {attrs.length > 0 && (
                    <div className="p-3 border-b border-slate-700/50">
                        <div className="text-xs text-slate-500 mb-1.5">Attributes</div>
                        <div className="space-y-1">
                            {attrs.map(([key, value]) => (
                                <div key={key} className="flex text-xs">
                                    <span className="text-slate-400 min-w-[80px]">{key}</span>
                                    <span className="text-slate-200 truncate">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Relationships */}
                {relationships.length > 0 && (
                    <div className="p-3 border-b border-slate-700/50">
                        <div className="text-xs text-slate-500 mb-1.5">
                            Relationships ({relationships.length})
                        </div>
                        <div className="space-y-1">
                            {outgoing.map(rel => {
                                const target = model.elements[rel.targetId];
                                return (
                                    <div
                                        key={rel.id}
                                        className="flex items-center gap-1 text-xs cursor-pointer hover:bg-slate-700/30 rounded px-1 py-0.5"
                                        onClick={() => selectElement(rel.targetId)}
                                    >
                                        <span className="text-slate-500">&rarr;</span>
                                        <span className="text-blue-400">{rel.type}</span>
                                        <span className="text-slate-300 truncate">
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
                                        className="flex items-center gap-1 text-xs cursor-pointer hover:bg-slate-700/30 rounded px-1 py-0.5"
                                        onClick={() => selectElement(rel.sourceId)}
                                    >
                                        <span className="text-slate-500">&larr;</span>
                                        <span className="text-emerald-400">{rel.type}</span>
                                        <span className="text-slate-300 truncate">
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
                    <div className="p-3 border-b border-slate-700/50">
                        <div className="text-xs text-slate-500 mb-1.5">Guidance</div>
                        <div className="space-y-2">
                            {violations.map((v, i) => (
                                <div
                                    key={`${v.ruleId}-${i}`}
                                    className={`text-xs p-2 rounded ${
                                        v.severity === 'error'
                                            ? 'bg-red-500/10 border border-red-500/20'
                                            : v.severity === 'warning'
                                            ? 'bg-amber-500/10 border border-amber-500/20'
                                            : 'bg-blue-500/10 border border-blue-500/20'
                                    }`}
                                >
                                    <div className={
                                        v.severity === 'error' ? 'text-red-300' :
                                        v.severity === 'warning' ? 'text-amber-300' :
                                        'text-blue-300'
                                    }>
                                        {v.description}
                                    </div>
                                    <div className="text-slate-500 mt-0.5">[{v.ruleId}]</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* No violations = compliant */}
                {violations.length === 0 && (
                    <div className="p-3">
                        <div className="text-xs text-emerald-400/60 flex items-center gap-1">
                            <span>&#10003;</span> All rules satisfied
                        </div>
                    </div>
                )}

                {/* Source file */}
                <div className="p-3 text-xs text-slate-600">
                    {element.file}
                </div>
            </div>
        </div>
    );
}
