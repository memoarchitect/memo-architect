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

import { useCallback, useEffect, useRef, useState } from 'react';
import { COLOR } from '../../styles/tokens';
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
                    fontSize: t.heading,
                    fontWeight: page ? 700 : 500,
                    color: page ? COLOR.primary : '#374151',
                    letterSpacing: 0,
                    textTransform: 'none',
                }}>
                    {title}
                </h3>
                {typeof count === 'number' && (
                    <span style={{ fontSize: t.meta, color: COLOR.faint }}>{count}</span>
                )}
                {actions && <span onClick={e => e.stopPropagation()}>{actions}</span>}
                {collapsible && <span style={{ color: '#D1D5DB', fontSize: t.meta }}>{expanded ? '▾' : '▸'}</span>}
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

    useEffect(() => { setDraft(value); }, [value]);

    const commit = useCallback(() => {
        if (committed.current) return;
        committed.current = true;
        setEditing(false);
        if (draft !== value) onSave(draft);
    }, [draft, value, onSave]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { committed.current = true; setDraft(value); setEditing(false); }
    }, [commit, multiline, value]);

    const startEditing = () => { committed.current = false; setDraft(value); setEditing(true); };

    if (editing) {
        const shared = {
            value: draft,
            autoFocus: true,
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
            onBlur: commit,
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
        return multiline ? <textarea {...shared} /> : <input type="text" {...shared} />;
    }

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
                {value || (placeholder ?? 'Click to add…')}
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
