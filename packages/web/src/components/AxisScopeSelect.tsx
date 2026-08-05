// ─── Axis Scope Select ───────────────────────────────────────────────────────
//
// Picks what one matrix axis holds — and picks exactly *one* thing.
//
// This is deliberately not a multi-select. An axis that mixes semantic types
// compares things that are not comparable: a row list interleaving a hazard, a
// requirement, a function and a test case is a list of unrelated objects, and
// the marks between them cannot be read as a structure. So the choice is one
// architecture layer ("Logical — the whole System → Subsystem → Component
// tree") or one kind inside it ("just the LogicalComponents"), never a
// hand-assembled mixture.
//
// Layers come from the ontology, not from a list kept here, so a project with
// its own layers gets its own axes.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import type { LayerSummary } from '../analysis/dsm-hierarchy';
import { LAYER_COLORS } from '../constants';
import { COLOR, FONT, SHADOW } from '../styles/tokens';

/** What an axis lists: a whole layer, or one kind within it. */
export interface AxisScope {
    layer?: string;
    kind?: string;
}

export interface AxisScopeSelectProps {
    label: string;
    layers: LayerSummary[];
    value: AxisScope;
    onChange: (next: AxisScope) => void;
    width?: number;
    title?: string;
    describedAs?: string;
}

/** Title-case a layer id for display: `verification_validation` → `Verification validation`. */
export function layerLabel(layer: string): string {
    const spaced = layer.replace(/[_-]+/g, ' ').trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** How the current choice reads on the closed control. */
export function describeScope(value: AxisScope, layers: LayerSummary[]): string {
    if (value.kind) return value.kind;
    if (value.layer) {
        const summary = layers.find(entry => entry.layer === value.layer);
        return summary && summary.kinds.length === 1
            ? summary.kinds[0].kind
            : layerLabel(value.layer);
    }
    return 'Everything';
}

export function AxisScopeSelect({
    label, layers, value, onChange, width = 165, title, describedAs,
}: AxisScopeSelectProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (containerRef.current?.contains(event.target as Node)) return;
            setOpen(false);
            setQuery('');
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [open]);

    useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

    /** Each word narrows, and a layer stays visible when one of its kinds matches. */
    const matches = useMemo(() => {
        const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
        if (terms.length === 0) return layers;
        const hit = (text: string) => terms.every(term => text.toLowerCase().includes(term));
        return layers
            .map(entry => {
                if (hit(layerLabel(entry.layer))) return entry;
                const kinds = entry.kinds.filter(kind => hit(`${kind.kind} ${entry.layer}`));
                return kinds.length > 0 ? { ...entry, kinds } : null;
            })
            .filter((entry): entry is LayerSummary => entry !== null);
    }, [layers, query]);

    const choose = (next: AxisScope) => {
        onChange(next);
        setOpen(false);
        setQuery('');
    };

    const rowStyle = (selected: boolean, indented: boolean) => ({
        display: 'flex', alignItems: 'center', gap: '7px',
        padding: indented ? '4px 9px 4px 26px' : '5px 9px',
        cursor: 'pointer', fontSize: FONT.xs,
        background: selected ? '#E8F8F3' : 'transparent',
        color: COLOR.primary,
        fontWeight: selected ? 600 : 400,
    });

    return (
        <div ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: FONT.xs, color: COLOR.muted, whiteSpace: 'nowrap' }}>{label}</span>
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                title={title}
                onClick={() => setOpen(state => !state)}
                style={{
                    width, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '6px', padding: '3px 7px', borderRadius: '5px',
                    border: `1px solid ${COLOR.accent}`, background: COLOR.surface,
                    fontSize: FONT.xs, color: COLOR.primary, cursor: 'pointer', textAlign: 'left',
                }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                    {value.layer && (
                        <span style={{
                            width: '3px', height: '12px', borderRadius: '2px', flexShrink: 0,
                            background: LAYER_COLORS[value.layer] || '#9CA3AF',
                        }} />
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {describeScope(value, layers)}
                    </span>
                </span>
                <span style={{ fontSize: '9px', color: COLOR.faint }}>{'▼'}</span>
            </button>

            {open && (
                <div
                    role="listbox"
                    style={{
                        position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 60,
                        width: Math.max(width + 60, 240), background: COLOR.surface,
                        border: `1px solid ${COLOR.border}`, borderRadius: '7px',
                        boxShadow: SHADOW.lg, overflow: 'hidden',
                    }}
                >
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); setQuery(''); } }}
                        placeholder="Filter layers and types…"
                        aria-label={`Filter ${describedAs ?? label}`}
                        style={{
                            width: '100%', padding: '7px 9px', border: 'none',
                            borderBottom: `1px solid ${COLOR.borderLight}`,
                            fontSize: FONT.xs, outline: 'none', color: COLOR.primary,
                        }}
                    />
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {matches.length === 0 && (
                            <div style={{ padding: '10px', fontSize: FONT.xs, color: COLOR.faint }}>
                                Nothing matches {'“'}{query}{'”'}
                            </div>
                        )}
                        {matches.map(entry => (
                            <div key={entry.layer}>
                                <div
                                    role="option"
                                    aria-selected={value.layer === entry.layer && !value.kind}
                                    onClick={() => choose({ layer: entry.layer })}
                                    style={rowStyle(value.layer === entry.layer && !value.kind, false)}
                                >
                                    <span style={{
                                        width: '3px', height: '12px', borderRadius: '2px', flexShrink: 0,
                                        background: LAYER_COLORS[entry.layer] || '#9CA3AF',
                                    }} />
                                    <span style={{ flex: 1 }}>{layerLabel(entry.layer)}</span>
                                    <span style={{ color: COLOR.faint, fontSize: '11px' }}>{entry.elementCount}</span>
                                </div>
                                {/* A layer with one kind is that kind; listing it twice says nothing. */}
                                {entry.kinds.length > 1 && entry.kinds.map(kind => (
                                    <div
                                        key={kind.kind}
                                        role="option"
                                        aria-selected={value.kind === kind.kind}
                                        onClick={() => choose({ layer: entry.layer, kind: kind.kind })}
                                        style={rowStyle(value.kind === kind.kind, true)}
                                    >
                                        <span style={{ flex: 1, color: COLOR.secondary }}>{kind.kind}</span>
                                        <span style={{ color: COLOR.faint, fontSize: '11px' }}>{kind.elementCount}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
