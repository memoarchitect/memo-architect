// ─── Relationship Quick Add ───────────────────────────────────────────────────
//
// Inline relationship authoring in the Properties panel: type part of an
// element's ID, name, or short ID, pick it from a live list segregated by kind,
// then choose from the relationship types the ontology allows between the two.
// Confirming writes a typed connection usage into project SysML.
//
// The expanded inline browser remains the surface for browsing by relationship
// first, or filtering a large model by layer and package. This is
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
import { TypeFilterSelect } from './TypeFilterSelect';

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

/** Match only targets for which MEMO defines at least one authorable relationship. */
export function matchLegalElements(
    elements: Record<string, MemoElement>,
    options: {
        query: string;
        source: MemoElement;
        registries: OntologyRegistriesDTO;
        limit?: number;
        filterKinds?: string[];
    },
): MemoElement[] {
    return matchElements(elements, {
        query: options.query,
        excludeId: options.source.id,
        // Filter legality before applying the visible cap, otherwise a large set
        // of illegal lexical matches can hide legal results below it.
        limit: Object.keys(elements).length,
    })
        .filter(candidate => !options.filterKinds || options.filterKinds.length === 0 || options.filterKinds.includes(candidate.kind))
        .filter(candidate => legalRelationshipTypes(options.source, candidate, options.registries).length > 0)
        .slice(0, options.limit ?? MAX_MATCHES);
}

export function RelationshipQuickAdd({
    element, model, registries, enabled, onCreate,
}: RelationshipQuickAddProps) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [filterKinds, setFilterKinds] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // A different element means a different set of legal links.
    useEffect(() => {
        setQuery(''); setOpen(false); setActiveIndex(0); setFilterKinds([]);
    }, [element.id]);

    // ─── Live element matches, segregated by kind ───────────────────────────

    const allModelKinds = useMemo(() => Array.from(new Set(Object.values(model.elements).map(e => e.kind))).sort(), [model.elements]);

    const matches = useMemo(
        () => matchLegalElements(model.elements, { query, source: element, registries, filterKinds }),
        [model.elements, element, query, registries, filterKinds]);

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
        const options = legalRelationshipTypes(element, candidate, registries);
        if (options.length > 0) {
            const preferredTerms = ['trace', 'satisfies', 'implements', 'verifies', 'validates'];
            const defaultMatch = options.find(o => 
                preferredTerms.some(term => o.definition.name.toLowerCase().includes(term) || o.definition.label.toLowerCase().includes(term))
            );
            const selectedOption = defaultMatch ?? options[0];
            
            onCreate({
                type: selectedOption.definition.name,
                sourceId: selectedOption.sourceId,
                targetId: selectedOption.targetId,
                direction: selectedOption.direction,
            });
        }
        
        setQuery('');
        setOpen(false);
    }, [element, registries, onCreate]);

    const reset = useCallback(() => {
        setQuery(''); setOpen(false);
    }, []);

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
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        value={query}
                        disabled={!enabled}
                        onChange={event => {
                            setQuery(event.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => { if (query.trim()) setOpen(true); }}
                        onBlur={() => { window.setTimeout(() => setOpen(false), 120); }}
                        onKeyDown={handleKeyDown}
                        placeholder={enabled ? 'Link to… type an element ID or name' : 'Connect to the dev server to author relationships'}
                        aria-label="Link this element to another"
                        aria-expanded={open}
                        aria-controls="memo-quick-add-matches"
                        aria-activedescendant={open && activeId ? `memo-quick-add-${activeId}` : undefined}
                        role="combobox"
                        autoComplete="off"
                        className="flex-1 px-2 py-1 rounded focus:outline-none"
                        style={{
                            fontSize: FONT.xs, background: '#FFFFFF',
                            border: `1px solid ${open && query.trim() ? ACCENT : BORDER}`, color: '#374151',
                            minWidth: 0,
                        }}
                    />
                    <div style={{ flexShrink: 0 }}>
                        <TypeFilterSelect
                            label=""
                            options={allModelKinds.map(kind => ({ value: kind, label: kind }))}
                            selected={filterKinds}
                            onChange={setFilterKinds}
                            allLabel="All Types"
                            iconOnly={true}
                        />
                    </div>
                </div>

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
                                No MEMO-legal trace target matches “{query.trim()}”.
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
                                Showing the first {MAX_MATCHES} matches — keep typing to narrow.
                            </div>
                        )}
                    </div>
                )}
            </div>
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
