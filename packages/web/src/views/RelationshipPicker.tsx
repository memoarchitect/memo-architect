// ─── RelationshipPicker ───────────────────────────────────────────────────────
//
// Popup shown after the user draws an edge between two nodes on the canvas.
//
// Legality comes from the ontology registries through legalRelationshipTypes —
// the same resolver the Properties panel uses — so the canvas and the panel can
// never disagree about what is allowed. There is no hardcoded relationship list
// here; an edge drawn between two kinds the ontology cannot relate offers
// nothing rather than offering something the server will reject.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    legalRelationshipTypes,
    type MemoElement,
    type OntologyRegistriesDTO,
    type RelationshipDirection,
} from '@memoarchitect/tools/browser';
import { REL_COLORS } from '../constants';
import { FONT } from '../styles/tokens';

/** What the canvas needs back to persist the user's choice. */
export interface RelationshipChoice {
    type: string;
    /** Element on the relationship's source end — may be the node drawn *to*. */
    sourceId: string;
    /** Element on the relationship's target end. */
    targetId: string;
    /** Direction relative to the node the edge was drawn from. */
    direction: RelationshipDirection;
}

interface RelationshipPickerProps {
    x: number;
    y: number;
    /** Element the edge was drawn from. */
    sourceElement: MemoElement;
    /** Element the edge was drawn to. */
    targetElement: MemoElement;
    registries: OntologyRegistriesDTO;
    onSelect: (choice: RelationshipChoice) => void;
    onCancel: () => void;
}

export function RelationshipPicker({
    x, y, sourceElement, targetElement, registries, onSelect, onCancel,
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

    // Every legal link between the two kinds, in both directions.
    const options = useMemo(
        () => legalRelationshipTypes(sourceElement, targetElement, registries),
        [sourceElement, targetElement, registries]);

    const filtered = useMemo(() => {
        const needle = search.trim().toLowerCase();
        if (!needle) return options;
        return options.filter(option =>
            option.definition.label.toLowerCase().includes(needle) ||
            option.definition.name.toLowerCase().includes(needle));
    }, [options, search]);

    // Clamp position to viewport
    const popupW = 260;
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
                    {sourceElement.kind} → {targetElement.kind}
                </div>
                <input
                    ref={inputRef}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search…"
                    aria-label="Search relationship types"
                    className="w-full px-2 py-1 rounded focus:outline-none"
                    style={{
                        fontSize: FONT.xs, background: '#F7F7F5',
                        border: '1px solid #E5E5E0', color: '#374151',
                    }}
                />
            </div>

            {/* Options */}
            <div className="flex-1 overflow-y-auto py-1">
                {filtered.map(option => {
                    const { definition, direction, sourceId, targetId } = option;
                    // An 'incoming' option reverses the drawn edge: the node the
                    // user dragged to ends up on the source end.
                    const reversed = direction === 'incoming';
                    return (
                        <button
                            key={`${definition.name}-${direction}`}
                            onClick={() => onSelect({ type: definition.name, sourceId, targetId, direction })}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left"
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#F7F7F5'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                        >
                            <div style={{
                                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                                background: REL_COLORS[definition.name] ?? '#6B7280',
                            }} />
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: FONT.xs, fontWeight: 500, color: '#1a1a1a' }}>
                                    {definition.label}
                                    {reversed && (
                                        <span style={{ color: '#9CA3AF', fontWeight: 400 }}> (reversed)</span>
                                    )}
                                </div>
                                <div className="truncate" style={{ fontSize: '10px', color: '#9CA3AF' }}>
                                    {definition.sourceEnd.name} → {definition.targetEnd.name}
                                </div>
                            </div>
                        </button>
                    );
                })}
                {filtered.length === 0 && (
                    <div className="p-3 text-center" style={{ color: '#9CA3AF', fontSize: FONT.xs }}>
                        {options.length === 0
                            ? `The ontology defines no relationship between a ${sourceElement.kind} and a ${targetElement.kind}.`
                            : 'No matching types'}
                    </div>
                )}
            </div>
        </div>
    );
}
