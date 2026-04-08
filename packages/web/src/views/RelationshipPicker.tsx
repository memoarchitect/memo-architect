// ─── RelationshipPicker ───────────────────────────────────────────────────────
//
// Popup shown after user draws an edge between two nodes.
// Lists valid relationship types (filtered by closure rules when available).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { REL_COLORS } from '../constants';
import { FONT } from '../styles/tokens';

interface RelationshipPickerProps {
    x: number;
    y: number;
    sourceKind: string;
    targetKind: string;
    /** Closure rules: kind → allowed relationship types. If empty, show all. */
    closureRules?: Record<string, string[]>;
    onSelect: (relType: string) => void;
    onCancel: () => void;
}

const ALL_REL_TYPES = [
    { type: 'mitigates', label: 'Mitigates', desc: 'Risk control → Hazard' },
    { type: 'causes', label: 'Causes', desc: 'Hazard → Hazardous Situation' },
    { type: 'leadsTo', label: 'Leads To', desc: 'Situation → Harm' },
    { type: 'identifies', label: 'Identifies', desc: 'Analysis → Risk' },
    { type: 'traceTo', label: 'Traces To', desc: 'Requirement → Requirement' },
    { type: 'satisfy', label: 'Satisfies', desc: 'Function → Requirement' },
    { type: 'verify', label: 'Verifies', desc: 'Test → Requirement' },
    { type: 'allocateTo', label: 'Allocates To', desc: 'Function → Component' },
    { type: 'composedOf', label: 'Composed Of', desc: 'Parent → Child' },
    { type: 'decomposedBy', label: 'Decomposed By', desc: 'Function → Sub-function' },
    { type: 'flow', label: 'Flow', desc: 'Data / material flow' },
    { type: 'succession', label: 'Succession', desc: 'Action sequence' },
    { type: 'aggregation', label: 'Aggregation', desc: 'Logical grouping' },
];

export function RelationshipPicker({
    x, y, sourceKind, targetKind, closureRules, onSelect, onCancel,
}: RelationshipPickerProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [search, setSearch] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus search on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onCancel();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onCancel]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onCancel]);

    // Filter by closure rules if provided
    const allowedTypes = closureRules
        ? (closureRules[sourceKind] ?? Object.keys(REL_COLORS))
        : Object.keys(REL_COLORS);

    const filtered = ALL_REL_TYPES.filter(rt =>
        allowedTypes.includes(rt.type) &&
        (!search || rt.label.toLowerCase().includes(search.toLowerCase()) ||
            rt.type.toLowerCase().includes(search.toLowerCase()))
    );

    // Also include any types in closureRules not in ALL_REL_TYPES (custom types)
    const knownTypes = new Set(ALL_REL_TYPES.map(r => r.type));
    const extraTypes = allowedTypes
        .filter(t => !knownTypes.has(t) && (!search || t.toLowerCase().includes(search.toLowerCase())));

    // Clamp position to viewport
    const popupW = 240;
    const popupH = 320;
    const left = Math.min(x, window.innerWidth - popupW - 8);
    const top = Math.min(y, window.innerHeight - popupH - 8);

    return (
        <div
            ref={ref}
            className="fixed z-50 flex flex-col shadow-xl rounded-xl overflow-hidden"
            style={{
                left, top, width: popupW, maxHeight: popupH,
                background: '#FFFFFF', border: '1px solid #E5E5E0',
                boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
            }}
        >
            {/* Header */}
            <div className="px-3 py-2" style={{ borderBottom: '1px solid #E5E5E0', flexShrink: 0 }}>
                <div style={{ fontSize: FONT.xs, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Relationship Type
                </div>
                <div style={{ fontSize: '10px', color: '#9CA3AF', marginBottom: 4 }}>
                    {sourceKind} → {targetKind}
                </div>
                <input
                    ref={inputRef}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search…"
                    className="w-full px-2 py-1 rounded focus:outline-none"
                    style={{
                        fontSize: FONT.xs, background: '#F7F7F5',
                        border: '1px solid #E5E5E0', color: '#374151',
                    }}
                />
            </div>

            {/* Options */}
            <div className="flex-1 overflow-y-auto py-1">
                {filtered.map(rt => (
                    <button
                        key={rt.type}
                        onClick={() => onSelect(rt.type)}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F7F7F5'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                    >
                        <div style={{
                            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                            background: REL_COLORS[rt.type] ?? '#6B7280',
                        }} />
                        <div>
                            <div style={{ fontSize: FONT.xs, fontWeight: 500, color: '#1a1a1a' }}>{rt.label}</div>
                            <div style={{ fontSize: '10px', color: '#9CA3AF' }}>{rt.desc}</div>
                        </div>
                    </button>
                ))}
                {extraTypes.map(t => (
                    <button
                        key={t}
                        onClick={() => onSelect(t)}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F7F7F5'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                    >
                        <div style={{
                            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                            background: REL_COLORS[t] ?? '#6B7280',
                        }} />
                        <span style={{ fontSize: FONT.xs, color: '#1a1a1a' }}>{t}</span>
                    </button>
                ))}
                {filtered.length === 0 && extraTypes.length === 0 && (
                    <div className="p-3 text-center" style={{ color: '#9CA3AF', fontSize: FONT.xs }}>
                        No matching types
                    </div>
                )}
            </div>
        </div>
    );
}
