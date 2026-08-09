// ─── Profile value primitives ────────────────────────────────────────────────
//
// One editable value, one read-only value, and the section wrapper they sit in.
//
// The affordance is the whole point. Previously an editable attribute and a
// derived one rendered as identical plain text, so the only way to discover
// what could be changed was to click things and watch for a cursor. Here an
// editable value always looks like a field — a bordered surface that lifts to
// the accent colour and shows a pencil on hover — and a locked value never
// does: it sits flat on a tinted surface and explains itself on hover.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { COLOR } from '../../styles/tokens';
import { useModelStore } from '../../store/model-store';
import { densityTokens, type Density } from './density';
import { editabilityLabel, isEditable, type Editability } from './editability';

// ─── Section ─────────────────────────────────────────────────────────────────

export function ProfileSection({
    title, count, actions, density, defaultOpen = true, collapsible = true, children,
}: {
    title: string;
    count?: number;
    actions?: React.ReactNode;
    density: Density;
    defaultOpen?: boolean;
    collapsible?: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const t = densityTokens(density);
    const page = density === 'page';
    const expanded = collapsible ? open : true;

    return (
        <section style={{
            padding: page ? '16px 18px' : t.sectionPadding,
            border: page ? '1px solid rgba(60,60,67,0.12)' : 'none',
            borderBottom: page ? '1px solid rgba(60,60,67,0.12)' : `1px solid ${COLOR.borderLight}`,
            borderRadius: page ? 14 : 0,
            background: page ? COLOR.surface : 'transparent',
            boxShadow: page ? '0 1px 2px rgba(15,23,42,0.04)' : 'none',
            marginBottom: page ? 14 : 0,
        }}>
            <header
                className="flex items-center gap-2"
                style={{
                    cursor: collapsible ? 'pointer' : 'default',
                    padding: page ? '0 0 10px 0' : '6px 10px',
                    borderRadius: page ? 0 : '6px',
                    margin: page ? 0 : '2px 4px',
                }}
                onClick={collapsible ? () => setOpen(o => !o) : undefined}
                onMouseEnter={e => { if (!page && collapsible) e.currentTarget.style.background = COLOR.surfaceAlt; }}
                onMouseLeave={e => { if (!page) e.currentTarget.style.background = 'transparent'; }}
            >
                <h3 style={{
                    flex: 1,
                    margin: 0,
                    fontSize: page ? t.heading : '10px',
                    fontWeight: page ? 700 : 'bold',
                    color: page ? COLOR.primary : '#6B7280',
                    letterSpacing: page ? 0 : '0.05em',
                    textTransform: page ? 'none' : 'uppercase',
                }}>
                    {title}
                </h3>
                {typeof count === 'number' && (
                    page ? (
                        <span style={{ fontSize: t.meta, color: COLOR.faint }}>{count}</span>
                    ) : (
                        <span className="px-1.5 py-0.5 rounded-md font-medium text-[10px]" style={{ background: '#F3F4F6', color: '#6B7280' }}>{count}</span>
                    )
                )}
                {actions && <span onClick={e => e.stopPropagation()}>{actions}</span>}
                {collapsible && <span style={{ color: '#D1D5DB', fontSize: page ? t.meta : 14 }}>{expanded ? '▾' : '▸'}</span>}
            </header>
            {expanded && <div style={{ padding: page ? 0 : '0 14px 8px' }}>{children}</div>}
        </section>
    );
}

// ─── Read-only value ─────────────────────────────────────────────────────────

/**
 * A value the user cannot change here, rendered so that is obvious before they
 * try. The reason travels with it — a locked field with no explanation reads as
 * a bug rather than a rule.
 */
export function ReadOnlyValue({ value, editability, density, mono }: {
    value: string;
    editability: Editability;
    density: Density;
    mono?: boolean;
}) {
    const t = densityTokens(density);
    const reason = editability.kind === 'editable' ? '' : editability.reason;

    return (
        <div
            title={reason || editabilityLabel(editability)}
            style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: t.valuePadding,
                borderRadius: t.radius,
                background: COLOR.surfaceAlt,
                border: '1px solid transparent',
                color: COLOR.muted,
                fontSize: t.text,
                fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
                cursor: 'default',
                minWidth: 0,
            }}
        >
            <span className="truncate" style={{ flex: 1 }}>
                {value || <span style={{ color: COLOR.faint, fontStyle: 'italic' }}>none</span>}
            </span>
            <span aria-hidden style={{ fontSize: t.meta, color: '#C7CBD1', flexShrink: 0 }}>🔒</span>
        </div>
    );
}

// ─── Editable value ──────────────────────────────────────────────────────────

/**
 * A value the user can change, which always looks like a field.
 *
 * Commit on blur and on Enter (single-line); Escape reverts. The draft is local
 * so an abandoned edit never reaches the store.
 */
export function EditableValue({
    value, onSave, density, multiline, placeholder, autoFocus, compact = false,
}: {
    value: string;
    onSave: (next: string) => void;
    density: Density;
    multiline?: boolean;
    placeholder?: string;
    autoFocus?: boolean;
    /** Table-row presentation: clearly editable without looking like a large form control. */
    compact?: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const [hover, setHover] = useState(false);
    const [draft, setDraft] = useState(value);
    const t = densityTokens(density);
    const committed = useRef(false);

    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    const [mentionSearch, setMentionSearch] = useState<string | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);

    const model = useModelStore(s => s.model);
    const inspectElement = useModelStore(s => s.inspectElement);

    useEffect(() => { setDraft(value); }, [value]);

    const candidates = useMemo(() => {
        if (mentionSearch === null || !model) return [];
        return Object.values(model.elements).filter(e => {
            const sid = (e.shortId ?? '').toLowerCase();
            const id = e.id.toLowerCase();
            const name = e.name.toLowerCase();
            return sid.includes(mentionSearch) || id.includes(mentionSearch) || name.includes(mentionSearch);
        }).slice(0, 10);
    }, [mentionSearch, model]);

    const commit = useCallback(() => {
        if (committed.current) return;
        if (mentionSearch !== null) return;
        committed.current = true;
        setEditing(false);
        if (draft !== value) onSave(draft);
    }, [draft, value, onSave, mentionSearch]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (mentionSearch !== null) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => (i + 1) % Math.max(1, candidates.length)); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(i => (i - 1 + candidates.length) % Math.max(1, candidates.length)); return; }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                const selected = candidates[mentionIndex];
                if (selected) {
                    const selStart = inputRef.current?.selectionStart ?? 0;
                    const beforeCursor = draft.slice(0, selStart);
                    const afterCursor = draft.slice(selStart);
                    const match = beforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_-]*)$/);
                    if (match) {
                        const replaceStart = selStart - match[1].length - 1;
                        const insertText = `[${selected.name}](@${selected.shortId ?? selected.id}) `;
                        const newDraft = draft.slice(0, replaceStart) + insertText + afterCursor;
                        setDraft(newDraft);
                        setMentionSearch(null);
                        
                        setTimeout(() => {
                            if (inputRef.current) {
                                inputRef.current.selectionStart = replaceStart + insertText.length;
                                inputRef.current.selectionEnd = inputRef.current.selectionStart;
                                inputRef.current.focus();
                            }
                        }, 0);
                    }
                } else {
                    setMentionSearch(null);
                }
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setMentionSearch(null);
                return;
            }
        }

        if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { committed.current = true; setDraft(value); setEditing(false); }
    }, [commit, multiline, value, mentionSearch, candidates, mentionIndex, draft]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const val = e.target.value;
        setDraft(val);
        const selStart = e.target.selectionStart ?? 0;
        const beforeCursor = val.slice(0, selStart);
        const match = beforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_-]*)$/);
        if (match) {
            setMentionSearch(match[1].toLowerCase());
            setMentionIndex(0);
        } else {
            setMentionSearch(null);
        }
    };

    const startEditing = () => { committed.current = false; setDraft(value); setEditing(true); };

    if (editing) {
        const shared = {
            ref: inputRef as any,
            value: draft,
            autoFocus: true,
            onChange: handleChange,
            onBlur: () => { setTimeout(commit, 200); },
            onKeyDown: handleKeyDown,
            placeholder,
            style: {
                width: '100%',
                padding: compact ? '5px 8px' : t.valuePadding,
                borderRadius: compact ? '6px' : t.radius,
                border: `1px solid ${COLOR.accent}`,
                boxShadow: `0 0 0 3px ${COLOR.accent}25`,
                background: COLOR.surface,
                color: COLOR.primary,
                fontSize: t.text,
                fontFamily: 'inherit',
                outline: 'none',
                ...(multiline ? { minHeight: density === 'page' ? '110px' : '54px', resize: 'vertical' as const, lineHeight: 1.6 } : {}),
            },
        };
        return (
            <div style={{ position: 'relative', width: '100%' }}>
                {multiline ? <textarea {...shared} /> : <input type="text" {...shared} />}
                
                {mentionSearch !== null && candidates.length > 0 && (
                    <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        marginTop: 4, background: '#fff', border: '1px solid #E5E7EB',
                        borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 100, maxHeight: 200, overflowY: 'auto'
                    }}>
                        {candidates.map((c, i) => (
                            <div
                                key={c.id}
                                style={{
                                    padding: '6px 12px', fontSize: 13, cursor: 'pointer',
                                    background: i === mentionIndex ? '#F3F4F6' : '#fff',
                                    display: 'flex', justifyContent: 'space-between'
                                }}
                                onClick={() => {
                                    const selStart = inputRef.current?.selectionStart ?? draft.length;
                                    const beforeCursor = draft.slice(0, selStart);
                                    const afterCursor = draft.slice(selStart);
                                    const match = beforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_-]*)$/);
                                    if (match) {
                                        const replaceStart = selStart - match[1].length - 1;
                                        const newDraft = draft.slice(0, replaceStart) + `[${c.name}](@${c.shortId ?? c.id}) ` + afterCursor;
                                        setDraft(newDraft);
                                    }
                                    setMentionSearch(null);
                                    inputRef.current?.focus();
                                }}
                            >
                                <span style={{ fontWeight: 500, color: '#111827' }}>{c.name}</span>
                                <span style={{ color: '#6B7280', fontSize: 11 }}>{c.shortId ?? c.id}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    const renderFormattedValue = (text: string) => {
        if (!text) return placeholder ?? 'Click to add…';
        if (!model) return text;
        const regex = /(\[[^\]]+\]\(@[a-zA-Z0-9_-]+\)|@[a-zA-Z0-9_-]+)/g;
        const parts = text.split(regex);
        
        return parts.map((part, i) => {
            let id = '';
            let label = '';
            
            if (part.startsWith('@')) {
                id = part.slice(1);
            } else if (part.startsWith('[') && part.includes('](@')) {
                const match = part.match(/\[([^\]]+)\]\(@([a-zA-Z0-9_-]+)\)/);
                if (match) {
                    label = match[1];
                    id = match[2];
                }
            }

            if (id) {
                const target = Object.values(model.elements).find(e => (e.shortId ?? e.id) === id) || model.elements[id];
                if (target) {
                    return (
                        <span 
                            key={i} 
                            onClick={(e) => { e.stopPropagation(); inspectElement(target.id); }}
                            style={{ 
                                color: COLOR.accent, cursor: 'pointer', fontWeight: 600, 
                                background: '#E0F2FE', padding: '1px 4px', borderRadius: '4px' 
                            }}
                            title={target.name}
                        >
                            {label ? label : `@${target.shortId ?? target.id}`}
                        </span>
                    );
                }
            }
            return <span key={i}>{part}</span>;
        });
    };

    return (
        <div
            role="button"
            tabIndex={0}
            title="Click to edit"
            onClick={startEditing}
            onFocus={() => setHover(true)}
            onBlur={() => setHover(false)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEditing(); } }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                display: 'flex', alignItems: 'flex-start', gap: 6,
                padding: compact ? '5px 8px' : t.valuePadding,
                borderRadius: compact ? '6px' : t.radius,
                background: hover ? '#F3F4F6' : 'transparent',
                border: `1px solid ${hover ? '#E5E7EB' : 'transparent'}`,
                boxShadow: 'none',
                color: value ? COLOR.primary : COLOR.faint,
                fontSize: t.text,
                cursor: 'text',
                transition: 'background-color 150ms ease, border-color 150ms ease',
                lineHeight: multiline ? 1.6 : 1.4,
                whiteSpace: multiline ? 'pre-wrap' : 'nowrap',
                overflow: 'hidden',
                minWidth: 0,
            }}
        >
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {renderFormattedValue(value)}
            </span>
            <span
                aria-hidden
                style={{
                    flexShrink: 0, fontSize: t.meta,
                    color: COLOR.accent,
                    opacity: hover ? 1 : 0,
                    transition: 'opacity 150ms ease',
                }}
            >
                ✎
            </span>
        </div>
    );
}

// ─── Field wrapper ───────────────────────────────────────────────────────────

/** A labelled value — the label carries the lock/pencil meaning for screen readers. */
export function ProfileField({ label, editability, density, children }: {
    label: string;
    editability: Editability;
    density: Density;
    children: React.ReactNode;
}) {
    const t = densityTokens(density);
    return (
        <div style={{ minWidth: 0 }}>
            <div
                className="flex items-center gap-1.5"
                style={{ marginBottom: 4, fontSize: t.meta, color: COLOR.muted }}
            >
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{label}</span>
                <span className="sr-only">{editabilityLabel(editability)}</span>
                {!isEditable(editability) && (
                    <span
                        title={editability.kind === 'editable' ? '' : editability.reason}
                        style={{
                            fontSize: '10px', padding: '0 4px', borderRadius: 4,
                            background: COLOR.surfaceAlt, color: COLOR.faint,
                            border: `1px solid ${COLOR.border}`,
                        }}
                    >
                        {editability.kind === 'identity' ? 'identifier' : 'derived'}
                    </span>
                )}
            </div>
            {children}
        </div>
    );
}

// ─── Legend ──────────────────────────────────────────────────────────────────

/** Explains the two affordances once, so every field does not have to. */
export function EditabilityLegend({ density }: { density: Density }) {
    const t = densityTokens(density);
    return (
        <div
            className="flex items-center gap-4 flex-wrap"
            style={{ fontSize: t.meta, color: COLOR.faint }}
        >
            <span className="flex items-center gap-1.5">
                <span style={{ color: COLOR.accent }}>✎</span> editable here
            </span>
            <span>Identity and source metadata are read-only</span>
        </div>
    );
}
