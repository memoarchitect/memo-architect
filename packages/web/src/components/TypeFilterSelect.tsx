// ─── Type Filter Select ──────────────────────────────────────────────────────
//
// A typeahead multi-select for picking element kinds, relationship types, or
// individual elements. Start typing and the list narrows; picking several is
// the normal case, because an axis is rarely one kind and a dependency is
// rarely one relation.
//
// Search is *incremental*: each whitespace-separated word narrows further, and
// all of them have to match. That is what makes an element list of several
// hundred usable — "pump safety" reaches the safety channel in the pump
// subsystem without needing its exact name, and adding a word never widens the
// result.
//
// The empty selection deliberately means "everything" rather than "nothing":
// an analysis matrix should open showing the model, not a blank grid the user
// has to configure before seeing anything.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COLOR, FONT, SHADOW } from '../styles/tokens';

export interface TypeFilterOption {
    value: string;
    /** Shown instead of the raw value when present. */
    label?: string;
    /** Right-aligned secondary text, e.g. how many elements carry this kind. */
    hint?: string;
    /** Small colour chip, e.g. the relationship's colour in the matrix. */
    color?: string;
    /** Heading this option is listed under, e.g. the element's kind. */
    group?: string;
    /** Extra searchable text that is not displayed, e.g. an id or short id. */
    keywords?: string;
}

export interface TypeFilterSelectProps {
    label: string;
    options: TypeFilterOption[];
    selected: string[];
    onChange: (next: string[]) => void;
    /** Summary text shown when nothing is selected. */
    allLabel?: string;
    placeholder?: string;
    /** Width of the closed control. */
    width?: number;
    title?: string;
    /**
     * What the control picks, for screen readers and the filter box's label.
     * Defaults to `label` — set it when the visible label is a shorthand like
     * "of" that only makes sense next to the control before it.
     */
    describedAs?: string;
    /**
     * Cap on rendered rows. A long list is for narrowing by typing, not for
     * scrolling through — and painting a thousand rows on every keystroke is
     * what makes a picker feel broken.
     */
    maxVisible?: number;
    /** Optional containment map. When supplied, options render as an expandable tree. */
    parentOf?: ReadonlyMap<string, string>;
    /** Render as a compact icon button instead of a text dropdown. */
    iconOnly?: boolean;
    /** How to align the popover relative to the button. Defaults to 'left'. */
    align?: 'left' | 'right';
}

/** Every word must match somewhere, so each one typed narrows the list. */
function optionMatches(option: TypeFilterOption, terms: string[]): boolean {
    if (terms.length === 0) return true;
    const haystack = `${option.label ?? option.value} ${option.group ?? ''} ${option.keywords ?? ''}`.toLowerCase();
    return terms.every(term => haystack.includes(term));
}

/**
 * The options a query selects, ranked.
 *
 * Exported because this, not the popover, is the behaviour worth pinning: the
 * query is split into words that all have to match, and what starts with the
 * first word is offered before what merely contains it. The render cap applies
 * to the returned list *afterwards* — "select all matches" always means this
 * whole list, never just the painted part.
 */
export function filterOptions(options: TypeFilterOption[], query: string): TypeFilterOption[] {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return options;
    const starts: TypeFilterOption[] = [];
    const contains: TypeFilterOption[] = [];
    for (const option of options) {
        if (!optionMatches(option, terms)) continue;
        const name = (option.label ?? option.value).toLowerCase();
        if (name.startsWith(terms[0])) starts.push(option); else contains.push(option);
    }
    return [...starts, ...contains];
}

export function TypeFilterSelect({
    label, options, selected, onChange,
    allLabel = 'All', placeholder = 'Type to filter…', width = 150, title,
    describedAs, maxVisible = 300, parentOf, iconOnly, align = 'left',
}: TypeFilterSelectProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedSet = useMemo(() => new Set(selected), [selected]);

    /**
     * Rank the way a person reading their own typing expects: what starts with
     * the first word they typed comes before what merely contains it. Selected
     * entries stay in the list so a second click removes them.
     */
    const matches = useMemo(() => filterOptions(options, query), [options, query]);

    /** What is actually painted, and whether anything was held back. */
    const visible = matches.length > maxVisible ? matches.slice(0, maxVisible) : matches;
    const hidden = matches.length - visible.length;

    const treeRows = useMemo(() => {
        if (!parentOf) return null;
        const optionById = new Map(options.map(option => [option.value, option]));
        const shown = new Set(matches.map(option => option.value));
        for (const id of [...shown]) {
            let parent = parentOf.get(id);
            while (parent && optionById.has(parent) && !shown.has(parent)) {
                shown.add(parent);
                parent = parentOf.get(parent);
            }
        }
        const children = new Map<string, string[]>();
        for (const id of shown) {
            const parent = parentOf.get(id);
            if (parent && shown.has(parent)) {
                const bucket = children.get(parent) ?? [];
                bucket.push(id); children.set(parent, bucket);
            }
        }
        const order = (a: string, b: string) => (optionById.get(a)?.label ?? a).localeCompare(optionById.get(b)?.label ?? b);
        children.forEach(bucket => bucket.sort(order));
        const roots = [...shown].filter(id => !parentOf.get(id) || !shown.has(parentOf.get(id)!)).sort(order);
        const rows: { option: TypeFilterOption; depth: number; children: string[] }[] = [];
        const visit = (id: string, depth: number) => {
            const option = optionById.get(id);
            if (!option) return;
            const childIds = children.get(id) ?? [];
            rows.push({ option, depth, children: childIds });
            if (childIds.length > 0 && expanded.has(id)) childIds.forEach(child => visit(child, depth + 1));
        };
        roots.forEach(root => visit(root, 0));
        return rows;
    }, [options, matches, parentOf, expanded]);

    useEffect(() => { setActiveIndex(0); }, [query, open]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (containerRef.current?.contains(event.target as Node)) return;
            // Drop the search text with the popover. A filter that survives the
            // close reopens showing a subset of the options with no visible
            // reason, which reads as "the list lost entries".
            setOpen(false);
            setQuery('');
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [open]);

    useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

    const toggle = useCallback((value: string) => {
        onChange(selectedSet.has(value)
            ? selected.filter(entry => entry !== value)
            : [...selected, value]);
    }, [onChange, selected, selectedSet]);

    const toggleTree = useCallback((value: string) => {
        if (!parentOf) return toggle(value);
        const descendants = new Set<string>([value]);
        let changed = true;
        while (changed) {
            changed = false;
            for (const [child, parent] of parentOf) {
                if (descendants.has(parent) && !descendants.has(child)) { descendants.add(child); changed = true; }
            }
        }
        const allSelected = [...descendants].every(id => selectedSet.has(id));
        onChange(allSelected ? selected.filter(id => !descendants.has(id)) : [...new Set([...selected, ...descendants])]);
    }, [parentOf, toggle, selected, selectedSet, onChange]);

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Escape') { setOpen(false); setQuery(''); return; }
        if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex(index => Math.min(index + 1, visible.length - 1)); }
        if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(index => Math.max(index - 1, 0)); }
        if (event.key === 'Enter' && visible[activeIndex]) { event.preventDefault(); toggle(visible[activeIndex].value); }
    };

    const summary = selected.length === 0
        ? allLabel
        : selected.length === 1
            ? (options.find(option => option.value === selected[0])?.label ?? selected[0])
            : `${selected.length} selected`;

    return (
        <div ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: FONT.xs, color: COLOR.muted, whiteSpace: 'nowrap' }}>{label}</span>
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                title={title ?? (selected.length > 0 ? selected.join(', ') : allLabel)}
                onClick={() => setOpen(value => !value)}
                style={iconOnly ? {
                    width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '4px', background: 'transparent', border: 'none',
                    color: selected.length > 0 ? COLOR.accent : COLOR.muted, cursor: 'pointer', padding: 0
                } : {
                    width, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '6px', padding: '3px 7px', borderRadius: '5px',
                    border: `1px solid ${selected.length > 0 ? COLOR.accent : COLOR.border}`,
                    background: COLOR.surface, fontSize: FONT.xs,
                    color: selected.length > 0 ? COLOR.primary : COLOR.muted,
                    cursor: 'pointer', textAlign: 'left',
                }}
            >
                {iconOnly ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                ) : (
                    <>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</span>
                        <span style={{ fontSize: '9px', color: COLOR.faint }}>{'▼'}</span>
                    </>
                )}
            </button>

            {open && (
                <div
                    role="listbox"
                    style={{
                        position: 'absolute', top: 'calc(100% + 4px)', 
                        ...(align === 'right' ? { right: 0 } : { left: 0 }),
                        zIndex: 60,
                        width: Math.max(width + 70, 220), background: COLOR.surface,
                        border: `1px solid ${COLOR.border}`, borderRadius: '7px',
                        boxShadow: SHADOW.lg, overflow: 'hidden',
                    }}
                >
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder={placeholder}
                        aria-label={`Filter ${describedAs ?? label}`}
                        style={{
                            width: '100%', padding: '7px 9px', border: 'none',
                            borderBottom: `1px solid ${COLOR.borderLight}`,
                            fontSize: FONT.xs, outline: 'none', color: COLOR.primary,
                        }}
                    />
                    <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                        {matches.length === 0 && (
                            <div style={{ padding: '10px', fontSize: FONT.xs, color: COLOR.faint }}>
                                Nothing matches {'“'}{query}{'”'}
                            </div>
                        )}
                        {(treeRows ?? visible.map(option => ({ option, depth: 0, children: [] as string[] }))).map(({ option, depth, children }, index) => {
                            const checked = selectedSet.has(option.value);
                            // A heading whenever the group changes, so a list of
                            // elements reads as its kinds rather than one run.
                            const heading = !treeRows && option.group && option.group !== visible[index - 1]?.group
                                ? option.group
                                : null;
                            return (
                                <div key={option.value}>
                                    {heading && (
                                        <div style={{
                                            position: 'sticky', top: 0, zIndex: 1,
                                            padding: '4px 9px 2px', fontSize: '10px', fontWeight: 600,
                                            color: COLOR.faint, background: COLOR.surface,
                                            borderBottom: `1px solid ${COLOR.borderLight}`,
                                        }}>
                                            {heading}
                                        </div>
                                    )}
                                    <div
                                        role="option"
                                        aria-selected={checked}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        onClick={() => toggleTree(option.value)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '7px',
                                            padding: '5px 9px 5px ' + (9 + depth * 16) + 'px', cursor: 'pointer', fontSize: FONT.xs,
                                            background: index === activeIndex ? COLOR.surfaceAlt : 'transparent',
                                            color: COLOR.primary,
                                        }}
                                    >
                                        {treeRows && (
                                            <button
                                                type="button"
                                                aria-label={children.length > 0 ? `${expanded.has(option.value) ? 'Collapse' : 'Expand'} ${option.label ?? option.value}` : undefined}
                                                disabled={children.length === 0}
                                                onClick={event => {
                                                    event.stopPropagation();
                                                    if (children.length === 0) return;
                                                    setExpanded(current => {
                                                        const next = new Set(current);
                                                        if (next.has(option.value)) next.delete(option.value); else next.add(option.value);
                                                        return next;
                                                    });
                                                }}
                                                style={{ width: '13px', padding: 0, border: 'none', background: 'none', color: COLOR.muted, cursor: children.length > 0 ? 'pointer' : 'default' }}
                                            >
                                                {children.length > 0 ? (expanded.has(option.value) ? '▾' : '▸') : ''}
                                            </button>
                                        )}
                                        <input type="checkbox" readOnly checked={checked} style={{ accentColor: COLOR.accent }} />
                                        {option.color && (
                                            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: option.color, flexShrink: 0 }} />
                                        )}
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {option.label ?? option.value}
                                        </span>
                                        {option.hint && <span style={{ color: COLOR.faint, fontSize: '11px' }}>{option.hint}</span>}
                                    </div>
                                </div>
                            );
                        })}
                        {hidden > 0 && (
                            <div style={{ padding: '7px 9px', fontSize: '11px', color: COLOR.faint, borderTop: `1px solid ${COLOR.borderLight}` }}>
                                {hidden.toLocaleString()} more match. Keep typing to narrow, or use
                                {' '}Select matches to take all {matches.length.toLocaleString()}.
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 9px', borderTop: `1px solid ${COLOR.borderLight}` }}>
                        <button
                            type="button"
                            // Every match, not just the painted ones — the cap is
                            // about rendering, never about what a click means.
                            onClick={() => onChange(matches.map(option => option.value))}
                            style={{ fontSize: '11px', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                            Select {query ? `matches (${matches.length})` : `all (${options.length})`}
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            style={{ fontSize: '11px', color: COLOR.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                            None
                        </button>
                        {selected.length > 0 && (
                            <span style={{ marginLeft: 'auto', fontSize: '11px', color: COLOR.faint }}>
                                {selected.length} picked
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
