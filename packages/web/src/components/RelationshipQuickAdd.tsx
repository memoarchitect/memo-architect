// ─── Relationship Quick Add ───────────────────────────────────────────────────
//
// Inline relationship authoring in the Properties panel: type part of an
// element's ID, name, or short ID, pick it from a live list segregated by kind,
// then choose from the relationship types the ontology allows between the two.
// Confirming writes a typed connection usage into project SysML.
//
// The full AddRelationshipDialog remains the surface for browsing by
// relationship first, or filtering a large model by layer and package. This is
// the fast path for the common case: "link this to that."
//
// Legality comes entirely from the ontology registries via the shared resolver
// in @memoarchitect/tools/browser — the same functions the dialog, the diagram
// picker, and the server all use, so a link offered here is a link the server
// accepts.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    isUniversalRelationship,
    legalRelationshipTypes,
    type LegalRelationshipOption,
    type MemoElement,
    type MemoModelDTO,
    type OntologyRegistriesDTO,
    type RelationshipDirection,
} from '@memoarchitect/tools/browser';
import { LAYER_COLORS } from '../constants';
import { FONT } from '../styles/tokens';

const BORDER = '#E5E5E0';
const ACCENT = '#2DD4A8';

/** Cap on rendered matches — a typeahead is for narrowing, not browsing. */
const MAX_MATCHES = 40;

export interface RelationshipQuickAddProps {
    element: MemoElement;
    model: MemoModelDTO;
    registries: OntologyRegistriesDTO;
    /** False while the dev server is unreachable — nothing can be persisted. */
    enabled: boolean;
    onCreate: (request: {
        type: string;
        sourceId: string;
        targetId: string;
        direction: RelationshipDirection;
    }) => void;
    /** Escape hatch to the full dialog for filtering and relationship-first flows. */
    onOpenFullDialog: () => void;
}

/** One kind's worth of matches, so the list reads as groups rather than a wall. */
export interface MatchGroup {
    kind: string;
    layer: string;
    elements: MemoElement[];
}

/**
 * Rank matches so the most literal interpretation of the typed text wins:
 * an exact ID first, then prefix matches, then anything containing it.
 */
function matchRank(element: MemoElement, needle: string): number {
    const id = element.id.toLowerCase();
    const shortId = element.shortId?.toLowerCase() ?? '';
    const name = element.name.toLowerCase();
    if (id === needle || shortId === needle) return 0;
    if (id.startsWith(needle) || shortId.startsWith(needle)) return 1;
    if (name.startsWith(needle)) return 2;
    if (id.includes(needle) || name.includes(needle)) return 3;
    return 4;
}

/**
 * Elements matching the typed text, best first.
 *
 * Matches on ID, short ID, name, and kind, because those are all things a user
 * plausibly has in hand when they set out to link something. The element being
 * inspected is always excluded — a self-relationship is not authorable.
 */
export function matchElements(
    elements: Record<string, MemoElement>,
    options: { query: string; excludeId: string; limit?: number },
): MemoElement[] {
    const needle = options.query.trim().toLowerCase();
    if (!needle) return [];
    return Object.values(elements)
        .filter(candidate => candidate.id !== options.excludeId)
        .filter(candidate => [candidate.id, candidate.shortId, candidate.name, candidate.kind]
            .filter(Boolean).join(' ').toLowerCase().includes(needle))
        .sort((a, b) =>
            matchRank(a, needle) - matchRank(b, needle) ||
            a.name.localeCompare(b.name))
        .slice(0, options.limit ?? MAX_MATCHES);
}

/**
 * Segregate ranked matches by kind, keeping rank order.
 *
 * Group order follows the matches rather than the alphabet, so the best match
 * stays at the top of the list instead of being buried under an
 * alphabetically earlier kind.
 */
export function groupMatchesByKind(matches: MemoElement[]): MatchGroup[] {
    const byKind = new Map<string, MatchGroup>();
    for (const match of matches) {
        let group = byKind.get(match.kind);
        if (!group) {
            group = { kind: match.kind, layer: match.layer, elements: [] };
            byKind.set(match.kind, group);
        }
        group.elements.push(match);
    }
    return [...byKind.values()];
}

export function RelationshipQuickAdd({
    element, model, registries, enabled, onCreate, onOpenFullDialog,
}: RelationshipQuickAddProps) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [target, setTarget] = useState<MemoElement | null>(null);
    const [selected, setSelected] = useState<LegalRelationshipOption | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // A different element means a different set of legal links.
    useEffect(() => {
        setQuery(''); setTarget(null); setSelected(null); setOpen(false); setActiveIndex(0);
    }, [element.id]);

    // ─── Live element matches, segregated by kind ───────────────────────────

    const matches = useMemo(
        () => matchElements(model.elements, { query, excludeId: element.id }),
        [model.elements, element.id, query]);

    /** Grouped for display, flat for keyboard navigation. */
    const groups = useMemo(() => groupMatchesByKind(matches), [matches]);

    /** Same order the groups render in — what ↑/↓ walks. */
    const flatMatches = useMemo(() => groups.flatMap(group => group.elements), [groups]);

    useEffect(() => { setActiveIndex(0); }, [query]);

    // Keep the highlighted row in view while arrowing through a long list.
    useEffect(() => {
        if (!open) return;
        listRef.current
            ?.querySelector<HTMLElement>('[data-active="true"]')
            ?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex, open]);

    const chooseTarget = useCallback((candidate: MemoElement) => {
        setTarget(candidate);
        setQuery(candidate.name || candidate.id);
        setOpen(false);
        setSelected(null);
    }, []);

    const reset = useCallback(() => {
        setQuery(''); setTarget(null); setSelected(null); setOpen(false);
    }, []);

    // ─── Legal relationships between the two elements ───────────────────────

    const options = useMemo(
        () => (target ? legalRelationshipTypes(element, target, registries) : []),
        [element, target, registries]);

    // One legal choice is preselected as a convenience — never auto-created.
    useEffect(() => {
        setSelected(options.length === 1 ? options[0] : null);
    }, [options]);

    const request = useMemo(() => {
        if (!selected || !target) return null;
        return {
            type: selected.definition.name,
            sourceId: selected.sourceId,
            targetId: selected.targetId,
            direction: selected.direction,
        };
    }, [selected, target]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            if (open) { setOpen(false); return; }
            reset();
            return;
        }
        if (!open || flatMatches.length === 0) {
            if (event.key === 'ArrowDown' && flatMatches.length > 0) {
                event.preventDefault();
                setOpen(true);
            }
            return;
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex(index => (index + 1) % flatMatches.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex(index => (index - 1 + flatMatches.length) % flatMatches.length);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const candidate = flatMatches[activeIndex];
            if (candidate) chooseTarget(candidate);
        }
    }, [open, flatMatches, activeIndex, chooseTarget, reset]);

    const activeId = flatMatches[activeIndex]?.id;

    return (
        <div className="mt-1.5" style={{ opacity: enabled ? 1 : 0.6 }}>
            <div className="relative">
                <input
                    ref={inputRef}
                    value={query}
                    disabled={!enabled}
                    onChange={event => {
                        setQuery(event.target.value);
                        setTarget(null);
                        setSelected(null);
                        setOpen(true);
                    }}
                    onFocus={() => { if (query.trim() && !target) setOpen(true); }}
                    onBlur={() => { window.setTimeout(() => setOpen(false), 120); }}
                    onKeyDown={handleKeyDown}
                    placeholder={enabled ? 'Link to… type an element ID or name' : 'Connect to the dev server to author relationships'}
                    aria-label="Link this element to another"
                    aria-expanded={open}
                    aria-controls="memo-quick-add-matches"
                    aria-activedescendant={open && activeId ? `memo-quick-add-${activeId}` : undefined}
                    role="combobox"
                    autoComplete="off"
                    className="w-full px-2 py-1 rounded focus:outline-none"
                    style={{
                        fontSize: FONT.xs, background: '#FFFFFF',
                        border: `1px solid ${target ? ACCENT : BORDER}`, color: '#374151',
                    }}
                />

                {open && query.trim() && (
                    <div
                        id="memo-quick-add-matches"
                        ref={listRef}
                        role="listbox"
                        className="absolute left-0 right-0 z-20 mt-1 rounded overflow-y-auto"
                        style={{
                            maxHeight: 240, background: '#FFFFFF',
                            border: `1px solid ${BORDER}`, boxShadow: '0 8px 24px rgba(15,23,42,0.14)',
                        }}
                    >
                        {flatMatches.length === 0 ? (
                            <div className="px-2 py-2" style={{ fontSize: FONT.xs, color: '#9CA3AF' }}>
                                No element matches “{query.trim()}”.
                            </div>
                        ) : (
                            groups.map(group => (
                                <div key={group.kind}>
                                    <GroupHeader kind={group.kind} layer={group.layer} count={group.elements.length} />
                                    {group.elements.map(candidate => (
                                        <MatchRow
                                            key={candidate.id}
                                            element={candidate}
                                            active={candidate.id === activeId}
                                            onSelect={() => chooseTarget(candidate)}
                                        />
                                    ))}
                                </div>
                            ))
                        )}
                        {matches.length === MAX_MATCHES && (
                            <div className="px-2 py-1" style={{ fontSize: '10px', color: '#9CA3AF' }}>
                                Showing the first {MAX_MATCHES} matches — keep typing to narrow, or{' '}
                                <button
                                    onMouseDown={event => { event.preventDefault(); onOpenFullDialog(); }}
                                    style={{ background: 'none', border: 'none', padding: 0, color: '#2563EB', cursor: 'pointer', fontSize: '10px' }}
                                >
                                    filter in the full dialog
                                </button>.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {target && (
                <TypeChooser
                    element={element}
                    target={target}
                    options={options}
                    selected={selected}
                    registries={registries}
                    onSelect={setSelected}
                />
            )}

            {target && (
                <div className="flex items-center gap-1.5 mt-1.5">
                    <button
                        onClick={() => { if (request) { onCreate(request); reset(); } }}
                        disabled={!request || !enabled}
                        className="px-2 py-0.5 rounded"
                        style={{
                            fontSize: FONT.xs, fontWeight: 600, border: 'none',
                            background: request && enabled ? ACCENT : '#E5E5E0',
                            color: request && enabled ? '#FFFFFF' : '#9CA3AF',
                            cursor: request && enabled ? 'pointer' : 'not-allowed',
                        }}
                    >
                        Create link
                    </button>
                    <button
                        onClick={reset}
                        className="px-2 py-0.5 rounded"
                        style={{
                            fontSize: FONT.xs, background: '#F0F0ED', color: '#374151',
                            border: 'none', cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Relationship type choice ───────────────────────────────────────────────

/**
 * The relationship types the ontology permits between the two elements.
 *
 * Both directions are offered, labelled by which element ends up on which end,
 * so an incoming link is authored here as directly as an outgoing one.
 */
function TypeChooser({ element, target, options, selected, registries, onSelect }: {
    element: MemoElement;
    target: MemoElement;
    options: LegalRelationshipOption[];
    selected: LegalRelationshipOption | null;
    registries: OntologyRegistriesDTO;
    onSelect: (option: LegalRelationshipOption) => void;
}) {
    // Types the ontology defines but that cannot join these two kinds. Naming
    // the count keeps the list honest: the panel is not hiding capability, the
    // ontology does not permit it.
    const excluded = registries.relationships.filter(definition =>
        !definition.isAbstract && !options.some(option => option.definition.name === definition.name)).length;

    if (options.length === 0) {
        return (
            <div className="mt-1.5 px-2 py-1.5 rounded" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <div style={{ fontSize: FONT.xs, color: '#92400E' }}>
                    The ontology defines no relationship between a {element.kind} and a {target.kind}.
                </div>
            </div>
        );
    }

    return (
        <div className="mt-1.5">
            <div className="mb-1" style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Relationship
            </div>
            <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                {options.map(option => {
                    const active = selected?.definition.name === option.definition.name
                        && selected?.direction === option.direction;
                    const universal = isUniversalRelationship(option.definition);
                    return (
                        <button
                            key={`${option.definition.name}-${option.direction}`}
                            onClick={() => onSelect(option)}
                            className="w-full text-left px-2 py-1 rounded"
                            style={{
                                background: active ? '#2DD4A818' : 'transparent',
                                border: 'none', cursor: 'pointer', display: 'block',
                            }}
                            onMouseEnter={event => { if (!active) event.currentTarget.style.background = '#F7F7F5'; }}
                            onMouseLeave={event => { if (!active) event.currentTarget.style.background = 'transparent'; }}
                        >
                            <div className="flex items-center gap-1.5">
                                <span style={{ fontSize: FONT.xs, fontWeight: 500, color: '#1a1a1a' }}>
                                    {option.definition.label}
                                </span>
                                {universal && (
                                    <span
                                        className="px-1 rounded"
                                        style={{ fontSize: '9px', background: '#FEF3C7', color: '#92400E' }}
                                        title="Joins any two elements. Prefer a relation that carries the meaning."
                                    >
                                        fallback
                                    </span>
                                )}
                            </div>
                            <div className="truncate" style={{ fontSize: '10px', color: '#9CA3AF' }}>
                                {option.direction === 'outgoing'
                                    ? `${element.name} → ${target.name}`
                                    : `${target.name} → ${element.name}`}
                            </div>
                        </button>
                    );
                })}
            </div>
            {excluded > 0 && (
                <div className="mt-0.5" style={{ fontSize: '10px', color: '#9CA3AF' }}>
                    {excluded} other relationship type{excluded > 1 ? 's are' : ' is'} defined but cannot
                    join a {element.kind} and a {target.kind}.
                </div>
            )}
        </div>
    );
}

// ─── Match list pieces ──────────────────────────────────────────────────────

function GroupHeader({ kind, layer, count }: { kind: string; layer: string; count: number }) {
    const color = LAYER_COLORS[layer] || '#666';
    return (
        <div
            className="flex items-center gap-1.5 px-2 py-1"
            style={{ background: '#FAFAF8', borderBottom: '1px solid #F0F0ED', position: 'sticky', top: 0 }}
        >
            <span className="w-2 h-2 flex-shrink-0" style={{ background: color, borderRadius: 2 }} />
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280' }}>{kind}</span>
            <span className="ml-auto" style={{ fontSize: '10px', color: '#D1D5DB' }}>{count}</span>
        </div>
    );
}

function MatchRow({ element, active, onSelect }: {
    element: MemoElement; active: boolean; onSelect: () => void;
}) {
    return (
        <div
            id={`memo-quick-add-${element.id}`}
            role="option"
            aria-selected={active}
            data-active={active}
            // mousedown, not click: the input's blur would close the list first.
            onMouseDown={event => { event.preventDefault(); onSelect(); }}
            className="flex items-center gap-1.5 px-2 py-1 cursor-pointer"
            style={{ background: active ? '#2DD4A818' : 'transparent' }}
        >
            <span className="truncate" style={{ fontSize: FONT.xs, color: '#1a1a1a' }}>
                {element.name || element.id}
            </span>
            <span
                className="ml-auto flex-shrink-0 font-mono truncate"
                style={{ fontSize: '10px', color: '#9CA3AF', maxWidth: 110 }}
                title={element.id}
            >
                {element.shortId ?? element.id}
            </span>
        </div>
    );
}
