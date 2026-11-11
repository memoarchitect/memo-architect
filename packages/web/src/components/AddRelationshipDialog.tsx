// ─── Add Relationship Dialog ──────────────────────────────────────────────────
//
// Pick the kind of element to link to, then the element. The kind is a dropdown
// of what the ontology allows this element to relate to; the elements of that
// kind are a table that can be searched. The ones already linked are at the top
// and can be removed there, so one table shows and edits a kind's links.
//
// Legality comes entirely from the ontology registries via the shared resolver
// in @memoarchitect/tools/browser — the same functions the diagram picker, the
// canvas, and the server all use.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    compatibleRelationshipTargets,
    legalRelationshipTypes,
    type LegalRelationshipOption,
    type MemoElement,
    type MemoModelDTO,
    type OntologyRegistriesDTO,
    type RelationshipDefinitionDTO,
    type RelationshipDirection,
} from '@memoarchitect/tools/browser';
import { COLOR, FONT } from '../styles/tokens';
import { elementIdTitle } from '../lib/trace-labels';
import { humanizeKind } from '../lib/humanize-kind';

type Outcome = void | { success: boolean; error?: string };

export interface ExistingLink {
    type: string;
    direction: RelationshipDirection;
    otherId: string;
    /** Present when the link can be removed from here. */
    relationshipId?: string;
}

export interface AddRelationshipDialogProps {
    element: MemoElement;
    model: MemoModelDTO;
    registries: OntologyRegistriesDTO;
    /** Diagram in scope, so the server can report view-profile fit. */
    diagramId?: string;
    onCancel: () => void;
    /** The dialog stays open after a link, so several can be added; a caller that wants it closed closes it. */
    onConfirm: (request: {
        type: string;
        sourceId: string;
        targetId: string;
        direction: RelationshipDirection;
    }) => Outcome | Promise<Outcome>;
    onRemove?: (relationshipId: string) => Outcome | Promise<Outcome>;
    /** Narrow what the dialog offers. Absent, it offers everything the ontology allows. */
    offered?: (definition: RelationshipDefinitionDTO, direction: RelationshipDirection) => boolean;
    /** Narrow the elements offered at the far end of a relation. */
    targetAllowed?: (definition: RelationshipDefinitionDTO, direction: RelationshipDirection, target: MemoElement) => boolean;
    /** What the header calls this dialog, for one that offers less than every relation. */
    title?: string;
    /** The element's existing links, shown first in the table and marked linked. */
    existing?: ExistingLink[];
}

/** Rows drawn at most; searching narrows them. */
const MAX_ROWS = 200;

/** `Satisfies →` for a link this element makes, `← Satisfies` for one made to it. */
export function choiceLabel(definition: RelationshipDefinitionDTO, direction: RelationshipDirection): string {
    return direction === 'outgoing' ? `${definition.label} →` : `← ${definition.label}`;
}

const selectStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: FONT.sm, color: COLOR.primary,
    border: `1px solid ${COLOR.border}`, background: COLOR.surface, outline: 'none',
};

const fieldLabel: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: COLOR.muted, marginBottom: 5 };

const COLUMNS = '132px minmax(0, 1fr) 150px';

export function AddRelationshipDialog({
    element, model, registries, onCancel, onConfirm, onRemove, title, offered, targetAllowed, existing = [],
}: AddRelationshipDialogProps) {
    const [chosenKind, setChosenKind] = useState<string | undefined>(undefined);
    const [chosenKey, setChosenKey] = useState<string | undefined>(undefined);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    // Links made from here that the model has not echoed back yet, so a row reads linked at once.
    const [added, setAdded] = useState<Set<string>>(new Set());
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onCancel]);

    // The kinds of element this one may relate to, each with the relationships that reach it. Legality
    // is by kind, so one element of each kind stands for the rest.
    const kinds = useMemo(() => {
        const byKind = new Map<string, MemoElement[]>();
        for (const candidate of Object.values(model.elements)) {
            if (candidate.id === element.id) continue;
            byKind.set(candidate.kind, [...(byKind.get(candidate.kind) ?? []), candidate]);
        }
        const result: { kind: string; count: number; options: LegalRelationshipOption[] }[] = [];
        for (const [kind, members] of byKind) {
            const options = legalRelationshipTypes(element, members[0], registries)
                .filter(option => !offered || offered(option.definition, option.direction))
                .filter(option => !targetAllowed || members.some(m => targetAllowed(option.definition, option.direction, m)));
            if (options.length > 0) result.push({ kind, count: members.length, options });
        }
        return result.sort((a, b) => humanizeKind(a.kind).localeCompare(humanizeKind(b.kind)));
    }, [element, model.elements, registries, offered, targetAllowed]);

    // Open on the kind this element already has most links to; else the first.
    const defaultKind = useMemo(() => {
        const linkedPer = new Map<string, number>();
        for (const link of existing) {
            const kind = model.elements[link.otherId]?.kind;
            if (kind) linkedPer.set(kind, (linkedPer.get(kind) ?? 0) + 1);
        }
        const withLinks = kinds.filter(k => linkedPer.has(k.kind)).sort((a, b) => linkedPer.get(b.kind)! - linkedPer.get(a.kind)!);
        return (withLinks[0] ?? kinds[0])?.kind;
    }, [kinds, existing, model.elements]);

    const kind = kinds.find(k => k.kind === chosenKind) ?? kinds.find(k => k.kind === defaultKind);
    const choices = kind?.options ?? [];
    // Open on the relationship already used most toward this kind, else the most specific one.
    const usedMost = useMemo(() => {
        const uses = new Map<string, number>();
        for (const link of existing) {
            if (model.elements[link.otherId]?.kind !== kind?.kind) continue;
            const key = `${link.type}::${link.direction}`;
            uses.set(key, (uses.get(key) ?? 0) + 1);
        }
        return choices.filter(o => uses.has(`${o.definition.name}::${o.direction}`))
            .sort((a, b) => uses.get(`${b.definition.name}::${b.direction}`)! - uses.get(`${a.definition.name}::${a.direction}`)!)[0];
    }, [existing, choices, kind?.kind, model.elements]);
    const choice = choices.find(o => `${o.definition.name}::${o.direction}` === chosenKey) ?? usedMost ?? choices[0];

    const linkedLinks = useMemo(() => new Map(
        choice
            ? existing.filter(e => e.type === choice.definition.name && e.direction === choice.direction).map(e => [e.otherId, e] as const)
            : []),
    [existing, choice]);

    const rows = useMemo(() => {
        if (!choice || !kind) return [];
        const targets = compatibleRelationshipTargets(element, choice.definition, choice.direction, model, registries, {
            query: query.trim(), kind: kind.kind,
        }).map(candidate => candidate.element)
            .filter(candidate => !targetAllowed || targetAllowed(choice.definition, choice.direction, candidate));
        const isLinked = (candidate: MemoElement) => linkedLinks.has(candidate.id) || added.has(addedKey(choice, candidate.id));
        return [...targets].sort((a, b) =>
            Number(isLinked(b)) - Number(isLinked(a)) || a.name.localeCompare(b.name)).slice(0, MAX_ROWS);
    }, [choice, kind, element, model, registries, query, targetAllowed, linkedLinks, added]);

    useEffect(() => { setActive(0); }, [kind?.kind, choice?.definition.name, choice?.direction, query]);

    const linkedCount = rows.filter(r => linkedLinks.has(r.id) || (choice && added.has(addedKey(choice, r.id)))).length;

    const run = async (key: string, action: () => Outcome | Promise<Outcome>, onDone?: () => void) => {
        setBusy(key); setError(null);
        try {
            const outcome = await action();
            if (outcome && outcome.success === false) setError(outcome.error ?? 'That did not work.');
            else onDone?.();
        } finally {
            setBusy(null);
        }
    };

    const link = (candidate: MemoElement) => {
        if (!choice) return;
        const request = choice.direction === 'outgoing'
            ? { type: choice.definition.name, sourceId: element.id, targetId: candidate.id, direction: 'outgoing' as const }
            : { type: choice.definition.name, sourceId: candidate.id, targetId: element.id, direction: 'incoming' as const };
        void run(candidate.id, () => onConfirm(request), () => setAdded(prev => new Set(prev).add(addedKey(choice, candidate.id))));
    };

    const unlink = (candidate: MemoElement, relationshipId: string) => {
        if (!onRemove || !choice) return;
        void run(candidate.id, () => onRemove(relationshipId));
    };

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'ArrowDown') { event.preventDefault(); setActive(i => Math.min(i + 1, rows.length - 1)); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
        else if (event.key === 'Enter' && rows[active]) {
            event.preventDefault();
            const candidate = rows[active];
            if (!linkedLinks.has(candidate.id) && !(choice && added.has(addedKey(choice, candidate.id)))) link(candidate);
        }
    };

    return (
        <div
            role="dialog" aria-modal="true" aria-label={title ?? 'Add relationship'}
            onClick={onCancel}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(8,39,68,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: 'min(920px, 100%)', height: 'min(640px, 100%)', display: 'flex', flexDirection: 'column',
                    background: COLOR.surface, borderRadius: 16, boxShadow: '0 30px 80px rgba(8,39,68,0.35)', overflow: 'hidden',
                }}
            >
                <div style={{ padding: '20px 24px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 18, fontWeight: 650, color: COLOR.primary, letterSpacing: '-0.01em' }}>{title ?? 'Relationships'}</div>
                        <div className="truncate" style={{ fontSize: FONT.sm, color: COLOR.muted, marginTop: 2 }}>
                            {element.name} · {humanizeKind(element.kind)}
                        </div>
                    </div>
                    <button onClick={onCancel} aria-label="Close"
                        style={{ width: 32, height: 32, border: 0, borderRadius: 8, background: COLOR.surfaceAlt, color: COLOR.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
                </div>

                {kinds.length === 0 ? (
                    <div style={{ padding: '8px 24px 24px', fontSize: FONT.sm, color: COLOR.faint }}>
                        The ontology defines no relationship that a {humanizeKind(element.kind).toLowerCase()} can take part in.
                    </div>
                ) : (
                    <>
                        <div style={{ padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                            <label>
                                <span style={fieldLabel}>Link to</span>
                                <select
                                    aria-label="Element type"
                                    value={kind?.kind}
                                    onChange={e => { setChosenKind(e.target.value); setChosenKey(undefined); setQuery(''); searchRef.current?.focus(); }}
                                    style={selectStyle}
                                >
                                    {kinds.map(k => (
                                        <option key={k.kind} value={k.kind}>{humanizeKind(k.kind)} ({k.count})</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span style={fieldLabel}>Relationship</span>
                                <select
                                    aria-label="Relationship"
                                    value={choice ? `${choice.definition.name}::${choice.direction}` : ''}
                                    onChange={e => setChosenKey(e.target.value)}
                                    disabled={choices.length < 2}
                                    style={{ ...selectStyle, background: choices.length < 2 ? COLOR.surfaceAlt : COLOR.surface }}
                                >
                                    {choices.map(o => (
                                        <option key={`${o.definition.name}::${o.direction}`} value={`${o.definition.name}::${o.direction}`}>
                                            {choiceLabel(o.definition, o.direction)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div style={{ padding: '14px 24px 12px' }}>
                            <input
                                ref={searchRef}
                                autoFocus
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={onKeyDown}
                                placeholder={`Search ${kind ? humanizeKind(kind.kind).toLowerCase() : 'elements'} by id or name`}
                                aria-label="Search elements"
                                autoComplete="off"
                                style={{ ...selectStyle, background: COLOR.surfaceAlt, border: '1px solid transparent' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: COLUMNS, gap: 12, padding: '8px 24px', borderTop: `1px solid ${COLOR.borderLight}`, borderBottom: `1px solid ${COLOR.borderLight}`, fontSize: 11, fontWeight: 600, color: COLOR.muted, letterSpacing: '0.04em' }}>
                            <span>ID</span><span>NAME</span><span style={{ textAlign: 'right' }}>STATUS</span>
                        </div>
                        <div role="listbox" aria-label="Elements" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                            {rows.length === 0 && (
                                <div style={{ padding: '28px 24px', fontSize: FONT.sm, color: COLOR.faint }}>
                                    {query.trim() ? 'No element matches that search.' : 'No element of this type can take part in this relationship.'}
                                </div>
                            )}
                            {rows.map((candidate, index) => {
                                const { id, title: name } = elementIdTitle(candidate, candidate.id);
                                const existingLink = linkedLinks.get(candidate.id);
                                const isLinked = !!existingLink || (!!choice && added.has(addedKey(choice, candidate.id)));
                                const working = busy === candidate.id;
                                return (
                                    <div
                                        key={candidate.id}
                                        role="option" aria-selected={index === active}
                                        onMouseEnter={() => setActive(index)}
                                        style={{
                                            display: 'grid', gridTemplateColumns: COLUMNS, gap: 12, alignItems: 'center',
                                            padding: '9px 24px', fontSize: FONT.sm, color: COLOR.primary,
                                            background: index === active ? COLOR.surfaceAlt : 'transparent',
                                        }}
                                    >
                                        <span className="font-mono truncate" style={{ fontSize: 12, color: COLOR.muted }}>{id ?? '—'}</span>
                                        <span className="truncate" title={name}>{name}</span>
                                        <span style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
                                            {isLinked ? (
                                                <>
                                                    <span style={{ color: '#0F766E', fontWeight: 600, fontSize: FONT.xs }}>✓ Linked</span>
                                                    {existingLink?.relationshipId && onRemove && (
                                                        <button onClick={() => unlink(candidate, existingLink.relationshipId!)} disabled={working}
                                                            style={{ border: 0, background: 'none', cursor: 'pointer', color: COLOR.muted, fontSize: FONT.xs, padding: 0, textDecoration: 'underline' }}>
                                                            Remove
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <button onClick={() => link(candidate)} disabled={working}
                                                    style={{
                                                        padding: '4px 14px', borderRadius: 999, fontSize: FONT.xs, fontWeight: 600, cursor: 'pointer',
                                                        border: `1px solid ${COLOR.border}`, background: COLOR.surface, color: COLOR.primary,
                                                    }}>
                                                    {working ? 'Linking…' : 'Link'}
                                                </button>
                                            )}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                <div style={{ padding: '12px 24px', borderTop: `1px solid ${COLOR.borderLight}`, display: 'flex', alignItems: 'center', gap: 12, background: '#FAFCFD' }}>
                    <span style={{ fontSize: FONT.xs, color: error ? '#DC2626' : COLOR.muted }}>
                        {error ?? (rows.length === MAX_ROWS ? `Showing the first ${MAX_ROWS}. Search to narrow.` : `${linkedCount} linked`)}
                    </span>
                    <button onClick={onCancel}
                        style={{ marginLeft: 'auto', padding: '7px 20px', borderRadius: 999, border: 0, background: COLOR.primary, color: '#fff', fontSize: FONT.sm, fontWeight: 600, cursor: 'pointer' }}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

function addedKey(choice: LegalRelationshipOption, otherId: string): string {
    return `${choice.definition.name}::${choice.direction}::${otherId}`;
}
