// ─── TraceabilityPanel ────────────────────────────────────────────────────────
//
// Properties panel section showing all traceability links for the selected
// element: Risks, Requirements, Specs, Test Cases, Allocations.
// Each section: clickable items, relationship type badge, [+ Add] button,
// completeness indicator, and collapse/expand state.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { MemoRelationship } from '@memo/core';
import { useModelStore, getRelationshipsForElement } from '../store/model-store';
import { sendAddRelationship } from '../store/ws-client';
import { REL_COLORS } from '../constants';
import { FONT } from '../styles/tokens';

// ─── Traceability categories ──────────────────────────────────────────────────

interface TraceCategory {
    id: string;
    label: string;
    icon: string;
    relTypes: string[];         // relationship types that belong here
    targetLayers?: string[];    // expected target layer(s) — for completeness
}

const TRACE_CATEGORIES: TraceCategory[] = [
    {
        id: 'risks',
        label: 'Risks & Hazards',
        icon: '⚠️',
        relTypes: ['mitigates', 'causes', 'leadsTo', 'identifies'],
        targetLayers: ['risk'],
    },
    {
        id: 'requirements',
        label: 'Requirements',
        icon: '📋',
        relTypes: ['traceTo', 'satisfy', 'refine', 'derives'],
        targetLayers: ['requirements'],
    },
    {
        id: 'verification',
        label: 'Verification',
        icon: '✅',
        relTypes: ['verify'],
        targetLayers: ['verification'],
    },
    {
        id: 'allocations',
        label: 'Allocations',
        icon: '🔧',
        relTypes: ['allocateTo'],
        targetLayers: ['physical', 'logical', 'software'],
    },
    {
        id: 'decomposition',
        label: 'Decomposition',
        icon: '🧩',
        relTypes: ['composedOf', 'decomposedBy', 'aggregation'],
        targetLayers: [],
    },
    {
        id: 'flows',
        label: 'Flows',
        icon: '↔️',
        relTypes: ['flow', 'succession'],
        targetLayers: [],
    },
];

// ─── Link picker popup ────────────────────────────────────────────────────────

interface LinkPickerProps {
    elementId: string;
    category: TraceCategory;
    onClose: () => void;
}

function LinkPicker({ elementId, category, onClose }: LinkPickerProps) {
    const model = useModelStore(s => s.model);
    const [search, setSearch] = useState('');
    const [selectedEl, setSelectedEl] = useState<string>('');
    const [selectedRel, setSelectedRel] = useState<string>(category.relTypes[0] ?? '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    // Filter target candidates: same model, not already linked
    const candidates = useMemo(() => {
        if (!model) return [];
        const existingRels = new Set(
            model.relationships
                .filter(r => r.sourceId === elementId || r.targetId === elementId)
                .map(r => r.sourceId === elementId ? r.targetId : r.sourceId)
        );
        return Object.values(model.elements)
            .filter(el => {
                if (el.id === elementId) return false;
                if (existingRels.has(el.id)) return false;
                if (category.targetLayers && category.targetLayers.length > 0) {
                    return category.targetLayers.includes(el.layer);
                }
                return true;
            })
            .filter(el =>
                !search ||
                el.name.toLowerCase().includes(search.toLowerCase()) ||
                el.kind.toLowerCase().includes(search.toLowerCase())
            )
            .slice(0, 50);
    }, [model, elementId, category, search]);

    const confirm = useCallback(() => {
        if (!selectedEl || !selectedRel) return;
        sendAddRelationship(elementId, selectedEl, selectedRel);
        onClose();
    }, [elementId, selectedEl, selectedRel, onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.3)' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="rounded-2xl overflow-hidden flex flex-col"
                style={{
                    width: 380, maxHeight: 520,
                    background: '#FFFFFF', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                }}
            >
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #E5E5E0' }}>
                    <div>
                        <div style={{ fontSize: FONT.sm, fontWeight: 600, color: '#1a1a1a' }}>
                            {category.icon} Add {category.label} Link
                        </div>
                        <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: 2 }}>
                            Source: {elementId}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '18px' }}
                    >
                        ×
                    </button>
                </div>

                {/* Relationship type selector */}
                <div className="px-4 py-2 flex items-center gap-2 flex-wrap" style={{ borderBottom: '1px solid #E5E5E0' }}>
                    <span style={{ fontSize: FONT.xs, color: '#9CA3AF', flexShrink: 0 }}>Type:</span>
                    {category.relTypes.map(rt => (
                        <button
                            key={rt}
                            onClick={() => setSelectedRel(rt)}
                            style={{
                                fontSize: FONT.xs, padding: '2px 10px', borderRadius: 12,
                                border: `1px solid ${selectedRel === rt ? (REL_COLORS[rt] ?? '#2DD4A8') : '#E5E5E0'}`,
                                background: selectedRel === rt ? ((REL_COLORS[rt] ?? '#2DD4A8') + '18') : 'transparent',
                                color: selectedRel === rt ? (REL_COLORS[rt] ?? '#2DD4A8') : '#6B7280',
                                cursor: 'pointer', fontWeight: selectedRel === rt ? 600 : 400,
                            }}
                        >
                            {rt}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="px-4 py-2">
                    <input
                        ref={inputRef}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search elements…"
                        className="w-full px-3 py-1.5 rounded-lg focus:outline-none"
                        style={{ fontSize: FONT.xs, border: '1px solid #E5E5E0', background: '#F7F7F5', color: '#374151' }}
                    />
                </div>

                {/* Candidates list */}
                <div className="flex-1 overflow-y-auto px-2 pb-2">
                    {candidates.map(el => (
                        <button
                            key={el.id}
                            onClick={() => setSelectedEl(el.id)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left"
                            style={{
                                background: selectedEl === el.id ? '#E8F9F5' : 'transparent',
                                border: selectedEl === el.id ? '1px solid #2DD4A8' : '1px solid transparent',
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{
                                width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                                background: '#9CA3AF',
                            }} />
                            <div>
                                <div style={{ fontSize: FONT.xs, fontWeight: 500, color: '#1a1a1a' }}>{el.name}</div>
                                <div style={{ fontSize: '10px', color: '#9CA3AF' }}>{el.kind} · {el.layer}</div>
                            </div>
                        </button>
                    ))}
                    {candidates.length === 0 && (
                        <div className="text-center py-6" style={{ color: '#9CA3AF', fontSize: FONT.xs }}>
                            No matching elements found
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 flex gap-2 justify-end" style={{ borderTop: '1px solid #E5E5E0' }}>
                    <button onClick={onClose} style={{
                        fontSize: FONT.xs, padding: '5px 14px',
                        border: '1px solid #E5E5E0', borderRadius: 8, cursor: 'pointer',
                        background: '#F7F7F5', color: '#6B7280',
                    }}>
                        Cancel
                    </button>
                    <button
                        onClick={confirm}
                        disabled={!selectedEl}
                        style={{
                            fontSize: FONT.xs, padding: '5px 14px',
                            border: 'none', borderRadius: 8, cursor: selectedEl ? 'pointer' : 'not-allowed',
                            background: selectedEl ? '#2DD4A8' : '#E5E5E0',
                            color: selectedEl ? '#FFFFFF' : '#9CA3AF',
                            fontWeight: 600,
                        }}
                    >
                        Add Link
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Single traceability section ──────────────────────────────────────────────

interface TraceSectionProps {
    elementId: string;
    category: TraceCategory;
    rels: MemoRelationship[];
    totalCountForCategory?: number;  // for completeness indicator
    onNavigate: (targetId: string) => void;
}

function TraceSection({ elementId, category, rels, onNavigate }: TraceSectionProps) {
    const model = useModelStore(s => s.model);
    const [collapsed, setCollapsed] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    if (rels.length === 0 && collapsed) return null;

    return (
        <>
            <div style={{ borderBottom: '1px solid #EDEDEA' }}>
                {/* Section header */}
                <div
                    className="flex items-center gap-2 px-4 py-2 cursor-pointer"
                    onClick={() => setCollapsed(c => !c)}
                    style={{ userSelect: 'none' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F9F9F8'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                    <span style={{ fontSize: '12px', width: 16, textAlign: 'center' }}>{category.icon}</span>
                    <span style={{ fontSize: FONT.xs, fontWeight: 600, color: '#374151', flex: 1 }}>
                        {category.label}
                    </span>
                    {rels.length > 0 && (
                        <span
                            className="px-1.5 py-0.5 rounded-full"
                            style={{ fontSize: '9px', fontWeight: 700, background: '#E8F9F5', color: '#059669' }}
                        >
                            {rels.length}
                        </span>
                    )}
                    <button
                        onClick={e => { e.stopPropagation(); setShowPicker(true); }}
                        className="px-2 py-0.5 rounded"
                        style={{
                            fontSize: '9px', fontWeight: 600,
                            background: '#F0F0ED', color: '#6B7280',
                            border: '1px solid #E5E5E0', cursor: 'pointer',
                        }}
                        title={`Add ${category.label} link`}
                    >
                        + Add
                    </button>
                    <span style={{ color: '#9CA3AF', fontSize: '10px', marginLeft: 2 }}>
                        {collapsed ? '▶' : '▼'}
                    </span>
                </div>

                {/* Linked items */}
                {!collapsed && rels.length > 0 && (
                    <div className="pb-1">
                        {rels.map(rel => {
                            const isSource = rel.sourceId === elementId;
                            const otherId = isSource ? rel.targetId : rel.sourceId;
                            const otherEl = model?.elements[otherId];
                            const relColor = REL_COLORS[rel.type] ?? '#6B7280';

                            return (
                                <button
                                    key={rel.id}
                                    onClick={() => onNavigate(otherId)}
                                    className="w-full flex items-start gap-2.5 px-4 py-1.5 text-left"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#F9F9F8'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                                >
                                    {/* Direction arrow */}
                                    <span style={{ fontSize: '10px', color: '#9CA3AF', marginTop: 1, flexShrink: 0 }}>
                                        {isSource ? '→' : '←'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className="px-1.5 py-0.5 rounded"
                                                style={{
                                                    fontSize: '9px', fontWeight: 600,
                                                    background: relColor + '18', color: relColor,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {rel.type}
                                            </span>
                                            <span className="truncate" style={{ fontSize: FONT.xs, color: '#1a1a1a', fontWeight: 500 }}>
                                                {otherEl?.name ?? otherId}
                                            </span>
                                        </div>
                                        {otherEl && (
                                            <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: 1 }}>
                                                {otherEl.kind} · {otherEl.layer}
                                            </div>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '10px', color: '#9CA3AF', flexShrink: 0 }}>↗</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {!collapsed && rels.length === 0 && (
                    <div className="px-4 pb-2" style={{ fontSize: '10px', color: '#9CA3AF' }}>
                        No links yet — click + Add to create one
                    </div>
                )}
            </div>

            {showPicker && (
                <LinkPicker
                    elementId={elementId}
                    category={category}
                    onClose={() => setShowPicker(false)}
                />
            )}
        </>
    );
}

// ─── Main TraceabilityPanel ───────────────────────────────────────────────────

interface TraceabilityPanelProps {
    elementId: string;
}

export function TraceabilityPanel({ elementId }: TraceabilityPanelProps) {
    const model = useModelStore(s => s.model);
    const selectElement = useModelStore(s => s.selectElement);

    const rels = useMemo(() => getRelationshipsForElement(model, elementId), [model, elementId]);

    // Group relationships by category
    const relsByCategory = useMemo(() => {
        const grouped = new Map<string, MemoRelationship[]>();
        for (const cat of TRACE_CATEGORIES) {
            grouped.set(cat.id, []);
        }
        for (const rel of rels) {
            for (const cat of TRACE_CATEGORIES) {
                if (cat.relTypes.includes(rel.type)) {
                    grouped.get(cat.id)!.push(rel);
                    break;
                }
            }
        }
        return grouped;
    }, [rels]);

    const totalLinks = rels.length;
    const categoriesWithLinks = TRACE_CATEGORIES.filter(c => (relsByCategory.get(c.id) ?? []).length > 0).length;

    const onNavigate = useCallback((targetId: string) => {
        selectElement(targetId);
    }, [selectElement]);

    if (!model?.elements[elementId]) return null;

    return (
        <div className="flex flex-col">
            {/* Summary header */}
            <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid #E5E5E0' }}>
                <div>
                    <div style={{ fontSize: FONT.xs, fontWeight: 700, color: '#374151' }}>Traceability</div>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: 1 }}>
                        {totalLinks} link{totalLinks !== 1 ? 's' : ''} across {categoriesWithLinks} categor{categoriesWithLinks !== 1 ? 'ies' : 'y'}
                    </div>
                </div>
                {/* Overall completeness dot */}
                <div
                    className="flex items-center gap-1"
                    title={`${categoriesWithLinks} of ${TRACE_CATEGORIES.length} categories have links`}
                >
                    {TRACE_CATEGORIES.slice(0, 4).map(cat => {
                        const hasLinks = (relsByCategory.get(cat.id) ?? []).length > 0;
                        return (
                            <div
                                key={cat.id}
                                title={cat.label}
                                style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: hasLinks ? '#10B981' : '#E5E5E0',
                                }}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Category sections */}
            {TRACE_CATEGORIES.map(cat => (
                <TraceSection
                    key={cat.id}
                    elementId={elementId}
                    category={cat}
                    rels={relsByCategory.get(cat.id) ?? []}
                    onNavigate={onNavigate}
                />
            ))}
        </div>
    );
}
