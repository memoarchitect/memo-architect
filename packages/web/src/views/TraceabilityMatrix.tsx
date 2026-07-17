import { useMemo, useState, useCallback } from 'react';
import { useModelStore } from '../store/model-store';
import { LAYER_COLORS } from '../constants';
import type { MemoElement, MemoRelationship } from '@memoarchitect/tools/browser';

// ─── Presets ─────────────────────────────────────────────────────────────────

interface MatrixPreset {
    id: string;
    label: string;
    description: string;
    rowKinds: string[];
    colKinds: string[];
    relationshipTypes: string[];
}

const PRESETS: MatrixPreset[] = [
    {
        id: 'risk-control',
        label: 'ISO 14971: Risk \u2192 Control',
        description: 'Hazards and hazardous situations traced to risk controls',
        rowKinds: ['Hazard', 'HazardousSituation'],
        colKinds: ['RiskControl', 'SafetyGoal'],
        relationshipTypes: ['mitigates', 'traceTo', 'causes', 'leadsTo'],
    },
    {
        id: 'req-test',
        label: 'IEC 62304: Requirement \u2192 Test',
        description: 'Software requirements traced to verification tests',
        rowKinds: ['Requirement', 'Requirement', 'Requirement'],
        colKinds: ['Test'],
        relationshipTypes: ['verify', 'satisfy', 'traceTo'],
    },
    {
        id: 'req-function',
        label: 'Requirement \u2192 Function',
        description: 'Requirements traced to system/component functions',
        rowKinds: ['Requirement', 'Requirement', 'Requirement'],
        colKinds: ['Function', 'Function'],
        relationshipTypes: ['satisfy', 'traceTo', 'allocateTo'],
    },
    {
        id: 'function-component',
        label: 'Function \u2192 Component',
        description: 'Functions allocated to logical/physical components',
        rowKinds: ['Function', 'Function'],
        colKinds: ['System', 'Subsystem', 'Component', 'LogicalComponent', 'SoftwareComponent', 'PhysicalComponent'],
        relationshipTypes: ['allocateTo', 'traceTo', 'composedOf'],
    },
    {
        id: 'all',
        label: 'All Elements',
        description: 'Full N\u00d7N matrix of all elements and relationships',
        rowKinds: [],
        colKinds: [],
        relationshipTypes: [],
    },
];

// ─── Matrix Cell ─────────────────────────────────────────────────────────────

interface CellData {
    rels: MemoRelationship[];
}

function MatrixCell({ cell, onClick }: { cell: CellData | null; onClick?: () => void }) {
    if (!cell || cell.rels.length === 0) {
        return <td className="border" style={{ borderColor: '#E5E5E0', width: '28px', height: '28px' }} />;
    }

    const types = [...new Set(cell.rels.map(r => r.type))];
    const bg = cell.rels.length > 1 ? '#2DD4A830' : '#2DD4A818';

    return (
        <td
            className="border text-center cursor-pointer"
            style={{ borderColor: '#E5E5E0', background: bg, width: '28px', height: '28px' }}
            title={types.join(', ')}
            onClick={onClick}
        >
            <span className="text-xs font-semibold" style={{ color: '#1B3A4B', fontSize: '10px' }}>
                {cell.rels.length}
            </span>
        </td>
    );
}

// ─── TraceabilityMatrix ──────────────────────────────────────────────────────

export function TraceabilityMatrix() {
    const model = useModelStore(s => s.model);
    const selectElement = useModelStore(s => s.selectElement);
    const [activePreset, setActivePreset] = useState<string>('risk-control');
    const [hoveredRow, setHoveredRow] = useState<string | null>(null);
    const [hoveredCol, setHoveredCol] = useState<string | null>(null);

    const preset = PRESETS.find(p => p.id === activePreset) || PRESETS[0];

    const { rows, cols, matrix } = useMemo(() => {
        if (!model) return { rows: [], cols: [], matrix: new Map<string, CellData>() };

        const elements = Object.values(model.elements);

        let rowEls: MemoElement[];
        let colEls: MemoElement[];

        if (preset.rowKinds.length === 0 && preset.colKinds.length === 0) {
            // "All" preset: use all elements
            rowEls = elements;
            colEls = elements;
        } else {
            const rowKindSet = new Set(preset.rowKinds);
            const colKindSet = new Set(preset.colKinds);
            rowEls = elements.filter(e => rowKindSet.has(e.kind));
            colEls = elements.filter(e => colKindSet.has(e.kind));
        }

        // Sort by kind then name
        rowEls.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
        colEls.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));

        // Build matrix
        const mat = new Map<string, CellData>();
        const relTypeSet = preset.relationshipTypes.length > 0 ? new Set(preset.relationshipTypes) : null;
        const rowIdSet = new Set(rowEls.map(e => e.id));
        const colIdSet = new Set(colEls.map(e => e.id));

        for (const rel of model.relationships) {
            if (relTypeSet && !relTypeSet.has(rel.type)) continue;

            // Check both directions
            if (rowIdSet.has(rel.sourceId) && colIdSet.has(rel.targetId)) {
                const key = `${rel.sourceId}:${rel.targetId}`;
                const existing = mat.get(key);
                if (existing) existing.rels.push(rel);
                else mat.set(key, { rels: [rel] });
            }
            if (rowIdSet.has(rel.targetId) && colIdSet.has(rel.sourceId)) {
                const key = `${rel.targetId}:${rel.sourceId}`;
                const existing = mat.get(key);
                if (existing) existing.rels.push(rel);
                else mat.set(key, { rels: [rel] });
            }
        }

        return { rows: rowEls, cols: colEls, matrix: mat };
    }, [model, preset]);

    // Coverage stats
    const rowsWithTrace = useMemo(() => {
        const traced = new Set<string>();
        for (const [key] of matrix) {
            const rowId = key.split(':')[0];
            traced.add(rowId);
        }
        return traced.size;
    }, [matrix]);

    if (!model) {
        return <div className="flex-1 flex items-center justify-center text-xs" style={{ color: '#9CA3AF' }}>No model loaded</div>;
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#FAFAF8' }}>
            {/* Preset selector */}
            <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid #E5E5E0', background: '#FFFFFF' }}>
                <span className="text-xs font-medium" style={{ color: '#6B7280' }}>Preset:</span>
                {PRESETS.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setActivePreset(p.id)}
                        className="px-2 py-1 text-xs rounded-md transition-colors"
                        style={
                            activePreset === p.id
                                ? { background: '#2DD4A818', color: '#1B3A4B', fontWeight: 600 }
                                : { color: '#6B7280' }
                        }
                        title={p.description}
                    >
                        {p.label}
                    </button>
                ))}
                <div className="flex-1" />
                <span className="text-xs" style={{ color: '#9CA3AF' }}>
                    {rows.length} rows &times; {cols.length} cols &middot; {rowsWithTrace}/{rows.length} traced ({rows.length > 0 ? Math.round(rowsWithTrace / rows.length * 100) : 0}%)
                </span>
            </div>

            {/* Matrix */}
            <div className="flex-1 overflow-auto p-4">
                {rows.length === 0 || cols.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs" style={{ color: '#9CA3AF' }}>
                        No elements match the selected preset. Try a different preset or add more model elements.
                    </div>
                ) : (
                    <table className="border-collapse text-xs" style={{ borderColor: '#E5E5E0' }}>
                        <thead>
                            <tr>
                                <th className="border px-2 py-1 sticky left-0 z-10" style={{ borderColor: '#E5E5E0', background: '#FFFFFF', minWidth: '140px' }} />
                                {cols.map(col => {
                                    const color = LAYER_COLORS[col.layer] || '#6B7280';
                                    return (
                                        <th
                                            key={col.id}
                                            className="border px-1 py-1"
                                            style={{
                                                borderColor: '#E5E5E0',
                                                background: hoveredCol === col.id ? '#F0F0ED' : '#FFFFFF',
                                                writingMode: 'vertical-rl', textOrientation: 'mixed',
                                                maxWidth: '28px', fontSize: '10px', color: '#374151',
                                                cursor: 'pointer',
                                            }}
                                            onMouseEnter={() => setHoveredCol(col.id)}
                                            onMouseLeave={() => setHoveredCol(null)}
                                            onClick={() => selectElement(col.id)}
                                            title={`${col.name} (${col.kind})`}
                                        >
                                            <span className="truncate" style={{ maxHeight: '100px', display: 'block', overflow: 'hidden' }}>
                                                {col.name}
                                            </span>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(row => {
                                const rowColor = LAYER_COLORS[row.layer] || '#6B7280';
                                return (
                                    <tr key={row.id}>
                                        <td
                                            className="border px-2 py-1 sticky left-0 z-10 cursor-pointer truncate"
                                            style={{
                                                borderColor: '#E5E5E0',
                                                background: hoveredRow === row.id ? '#F0F0ED' : '#FFFFFF',
                                                maxWidth: '180px', fontSize: '11px', color: '#374151',
                                                borderLeft: `3px solid ${rowColor}`,
                                            }}
                                            onMouseEnter={() => setHoveredRow(row.id)}
                                            onMouseLeave={() => setHoveredRow(null)}
                                            onClick={() => selectElement(row.id)}
                                            title={`${row.name} (${row.kind})`}
                                        >
                                            {row.name}
                                        </td>
                                        {cols.map(col => {
                                            const cell = matrix.get(`${row.id}:${col.id}`) || null;
                                            return (
                                                <MatrixCell
                                                    key={col.id}
                                                    cell={cell}
                                                    onClick={cell ? () => selectElement(row.id) : undefined}
                                                />
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
